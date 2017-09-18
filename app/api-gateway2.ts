// API gateway
//
// Author: Ralph Göllner 2017
//
require('dotenv').config({ path: 'app/.env'}); // read externalized configuration from .env file

// Logging
import { logger } from './services/logger';

// Health endpoints
var fs = require('fs');
import * as restify from 'restify';

// HTTP serving
var http = require('http');

// Microservice infrastructure
import { ConsulRegistry } from './registries/consul';
import * as CircuitBreaker from './hystrix/circuit-breaker';
import { Configuration } from './configuration/configuration';
import { ServiceRoute } from './models/service-route.model';
import { UrlRewriter } from './url-rewriter/url-rewriter';

// globals
process.on('unhandledRejection', error => {
  // TODO: hystrixjs will throw this with ....run.apply
});

class APIGateway {

  private SERVICE_NAME : string   = process.env.SVC_NAME;
  private SERVICE_VERSION: string = process.env.SVC_VERSION; // interface-info (for REST) 
  private SERVICE_BUILD: string   = process.env.SVC_BUILD;   // build-info (for logging)
  private SERVICE_PORT: string    = process.env.SVC_PORT;    // port (listening to API requests)

  public gateway : restify.Server; // expose for testing
  public actuators : restify.Server; // expose for testing

  public allRoutes : ServiceRoute[] = [];

  constructor (public logger) {

      logger.info("Initializing API gateway");
  
      var self = this;

      this.gateway = http.createServer(function(request, response) {

           // this url provides a stream with information about the circuit breakers state
           // usually these streams from several api gateway instances are aggregated 
           // by turbine and visualized in the hystrix dashboard
           if (request.url.startsWith('/hystrix')) {
               CircuitBreaker.instance.hystrixStreamResponse(request,response);
               return;
           }

           // API gateway responds only to URIs prefixed with 'api'
           if (!request.url.toLowerCase().startsWith('/api/')) {
                logger.debug("IGNORE " + request.url);

                response.statusCode = 400; // bad request
                response.statusMessage = "only API requests";
                response.end();
                return;
            }
           
            if (process.env.FAKE_CORS == "true") {
                var isCORS = self.answerCORS(request, response);
                if (isCORS) { 
                    return;
                }
            }

            var microserviceNameAndVersion = self.parseRequest(request, response);
            if (!microserviceNameAndVersion) {
                response.statusCode = 400; // bad request
                response.statusMessage = "no service name could be parsed";
                response.end();
                return;
            }
      });

      this.gateway.listen(this.SERVICE_PORT);
      logger.info("Listening on port " + this.SERVICE_PORT); 
  
      this.initActuators(parseInt(this.SERVICE_PORT) + 1); // health endpoint for microservice infrastructure

      // load rewrite rules
      var config = new Configuration();
      config.readConfig().then((configRoutes:any) => {
          logger.info("Intializing redirection rules from git configuration:");
          configRoutes.allRoutes.forEach((itm) => {
                this.allRoutes.push(new ServiceRoute(itm.inPath, itm.serviceNameVersion));
                logger.info("- added path: " + itm.inPath + " --> " + itm.serviceNameVersion);
          });
      }, 
      (error) => { logger.error(JSON.stringify(error)); }); 

  } // constructor

  /** find out which microservices should receive the request */
  private parseRequest(request, response) {

        logger.info("Parsing " + request.method + " to " + request.url)

        var serviceName = null;
        var serviceInstances = [];
        var rewrittenUrl = request.url;   // routes can transform target url in the future
        
        // find service using Eureka
        // 1) split url (expected: /api/v1/servicename)
        //
        var pathparts = request.url.split("/");
        if (pathparts.length > 2) {
             serviceName = pathparts[3].toLowerCase() + "-" + pathparts[2].toLowerCase();
            // 2) lookup in Consul
            return new ConsulRegistry().findService(serviceName).then(serviceNameAndVersion => { 
                if (!serviceNameAndVersion) {
                    
                    var redirect = new UrlRewriter(this.allRoutes).redirectToService(request.url);
                    
                    if (!redirect) {
                        response.statusCode = 404; // not found
                        response.statusMessage = "service name not found";
                        response.end();

                        logger.info("Service name not found");
                        
                        return null;
                    } else {
                       // lookup if the redirection target service is available
                       return new ConsulRegistry().findService(redirect).then(redirectedServiceNameAndVersion => {
                           
                           if (!redirectedServiceNameAndVersion) {
                              response.statusCode = 404; // not found
                              response.statusMessage = "redirected service name not found";
                              response.end();

                              logger.info("Redirected service name not found");
                             
                              return null;
                           }

                           logger.info("Consul redir. lookup successful --> " + redirectedServiceNameAndVersion );
                           
                           var svc = redirectedServiceNameAndVersion.substring(0,redirectedServiceNameAndVersion.indexOf(":"));   
                           var svcPort = redirectedServiceNameAndVersion.substring(redirectedServiceNameAndVersion.indexOf(":") + 1); 
                           // wrap in circuit breaker
                           CircuitBreaker.instance.launchProcess(svc, svcPort, 
                                this.proxyRequest(request, redirectedServiceNameAndVersion, response)
                                    .then( (success) => {} )
                                    .catch ( () => {}));
                           return redirectedServiceNameAndVersion;
                       });
                    }
                }
                logger.info("Consul lookup successful --> " + serviceNameAndVersion );
                
                var svc = serviceNameAndVersion.substring(0,serviceNameAndVersion.indexOf(":"));   
                var svcPort = serviceNameAndVersion.substring(serviceNameAndVersion.indexOf(":") + 1); 
                // wrap in circuit breaker
                CircuitBreaker.instance.launchProcess(svc, svcPort, 
                                                      this.proxyRequest(request, serviceNameAndVersion, response)
                                                          .then( (success) => {} )
                                                          .catch( () => {}
                                                      ));
                return serviceNameAndVersion;
            });
        } else {
            return null;  
        }
  }

  /** create request to microservice using HystrixJS */
  private proxyRequest(request, serviceNameAndVersion: string, response) {
      
      var serviceName = serviceNameAndVersion.substring(0, serviceNameAndVersion.indexOf(":"));

      return new Promise((resolve,reject) => {

      logger.info("Forwarding request " + request.url + " to " + serviceNameAndVersion);

      var svc = serviceNameAndVersion.substring(0,serviceNameAndVersion.indexOf(":"));   
      var svcPort = serviceNameAndVersion.substring(serviceNameAndVersion.indexOf(":") + 1);  
      var rewrittenUrl = request.url;

      var proxy_request = http.request({
        port: svcPort,                         
        host: svc,                  
        method: request.method, 
        path: rewrittenUrl, 
        headers: request.headers
      });

      // add x-span and x-trace to response and proxy_requst
      var currentUUID = this.addCorrelationTokens(request, response, proxy_request);

      if (serviceNameAndVersion == "unit-test-v1:999") {
         response.write("Data for unit test.");
         response.statusCode = 200;
         response.end();

         resolve();
         return;
      }

      this.profile(serviceName, this.SERVICE_BUILD, "api.request.start", currentUUID);

      var self = this;

      proxy_request.addListener('response', function (proxy_response) {
    
            if (proxy_response.statusCode == 404) {
                logger.warn("404 File not found");
                reject(404);
            }

            proxy_response.addListener('data', function(chunk) {
                response.write(chunk, 'binary');
            });
            proxy_response.addListener('end', function() {

                self.profile(serviceName, self.SERVICE_BUILD, "api.request.end", currentUUID);

                self.kpi("api.request.count", 1, currentUUID);
                self.logger.info("Finished receiving data from microservice")

                response.end();

                resolve(200);
            
            });
            response.setHeader("x-trace-id", currentUUID);
            response.writeHead(proxy_response.statusCode, proxy_response.headers);

      });

      request.addListener('data', function(chunk) {
        proxy_request.write(chunk, 'binary');
      });

      request.addListener('end', function() {
        proxy_request.end();
      });

      }); // promise
  }

  /** add headers according to Spring Boot Sleuth conventions */
  private addCorrelationTokens(request, response, proxy_request) : string {
    
    // api-gateway adds correlation context for log analysis and debugging
    // this context has to be passed on in API call chains between microservices as well
    // as in MQ messages
    var uuidV4 = require('uuid/v4');

    var currentUUID = uuidV4();        // default: create a new correlation token with any request
    var currentSpanID = currentUUID;   // if there are no sub transactions span and trace are the same Id

    // for monitoring the correlation token can be handed in from "outside
    if (request.headers["x-trace-id"]) {
       currentUUID = request.headers["x-trace-id"];
    }
    if (request.headers["x-span-id"]) {
       currentSpanID = request.headers["x-span-id"];
    }

    response.setHeader("x-trace-id", currentUUID);     // correlation token for debugging/monitoring (SLF4J MDC)
    response.setHeader("x-span-id",  currentSpanID);   // correlation token (sub transactions) for debugging/monitoring (SLF4J MDC)

    proxy_request.setHeader("x-trace-id", currentUUID);     // correlation token for debugging/monitoring (SLF4J MDC)
    proxy_request.setHeader("x-span-id",  currentSpanID);   // correlation token (sub transactions) for debugging/monitoring (SLF4J MDC)


    if (request.headers["x-context"]) {
       response.setHeader("x-context", request.headers["x-context"]);  // pass on monitoring identification
    }

    return currentUUID;

  }

  /** generate CORS response for test environment - have to be set by microservices */
  private answerCORS(request, response) : boolean {

     if (request.method == "OPTIONS") {

        logger.info("--> approved by API gateway. Not forwarded to service (!)");
        // console.log(JSON.stringify(request.headers));

        response.statusCode = 200; // bad request
        response.setHeader("Access-Control-Allow-Origin", request.headers["origin"]);
        response.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, HEAD, POST, PUT, DELETE");
        response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        response.statusMessage = "approved by API gateway"; 
        response.end(); 
        return true;
    }
    return false;
  }

  /** configure & start actuator endpoints (port + 1) */
  private initActuators(actuatorsPort: number) {
     
     this.actuators = restify.createServer({ name: 'api-gateway-actuators'});
    
     this.actuators.listen(actuatorsPort.toString(), function() {
        logger.info("Actuator endpoints listening on port " + actuatorsPort);
     });

     // REST-Setup
      //
      var myAPI = this.actuators;

      fs.readdirSync(__dirname + '/routes').forEach(function (routeConfig: string) {
        if (routeConfig.substr(-3) === '.js' && routeConfig.indexOf("actuator.") > -1) {
          let route = require(__dirname + '/routes/' + routeConfig);
          logger.debug("- Linking actuator route: " + routeConfig);
          route.routes(myAPI);
        }
      });
  }

  /** key performance indicator logging */
  private kpi (kpiName, counter, correlationToken)  {
    var logMessage = new Date().toISOString().replace('.',',') + " KPI " + this.SERVICE_NAME + " " + this.SERVICE_BUILD +
                            " " + kpiName + " " + counter + " " + correlationToken;
    console.log(logMessage);
  }

  /** profile logging */
  private profile(serviceName, serviceBuild, methodName, correlationToken)  {
    var logMessage = new Date().toISOString().replace('.',',') + " PROFILE " + serviceName + " " + serviceBuild +
                            " " + methodName + " " + correlationToken;
    console.log(logMessage);
  }

}

export var apiGateway = new APIGateway(logger);