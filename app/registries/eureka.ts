// SERVICE-REGISTRATION/DISCOVERY
// ==============================
// we use Eureka and Spring Cloud Config from the netflix stack
const Eureka = require('eureka-js-client').Eureka;

var os = require('os');

export class EurekaRegistry {
 
    logger;
    client;

    constructor(_logger) {

        this.logger = _logger;

        const SERVICE_NAME : string   = process.env.SVC_NAME;
        const SERVICE_VERSION: string = process.env.SVC_VERSION; // interface-info (for REST) 
        const SERVICE_BUILD: string   = process.env.SVC_BUILD;   // build-info (for logging)
        const SERVER_PORT = process.env.SVC_PORT;

        var ipAddress = this.getIPAddress();

        this.client = new Eureka({
            instance: {
                app: SERVICE_NAME + '-' + SERVICE_VERSION,
                hostName: SERVICE_NAME + '-' + SERVICE_VERSION + "." + ipAddress,
                ipAddr: ipAddress,
                //statusPageUrl: 'http://localhost:8080/info',
                port: {
                '$': SERVER_PORT,
                '@enabled': 'true',
                },
                vipAddress: 'jq.test.something.com',
                dataCenterInfo: {
                '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
                name: 'MyOwn',
                },
            },
            eureka: {
                host: process.env.EUREKA_HOST,
                port: process.env.EUREKA_PORT,
                servicePath: process.env.EUREKA_SERVICE_PATH,
                maxRetries: 200,
                requestRetryDelay: 3000
            },
            // use winston instance for logging
            logger: this.logger
        });

        this.client.start(function(error){

            if (error) {
                this.logger.error("Service discovery registration failure");
                this.logger.error(error);
                return;
            }
           
            this.logger.info("Service discovery registration successful");

        });
    }

    /** lookup instance by name and version, e. g. my-service-v1 */
    findService(nameAndVersion: string) {
        var serviceInstances = this.client.getInstancesByAppId(nameAndVersion);
        if (serviceInstances.length == 0) {
            return null;
        }
        return serviceInstances[0].ipAddr + ":" + serviceInstances[0].port['$'];
    }

    /** find local IP */
    getIPAddress() {

        var ifaces = os.networkInterfaces();
        var ipAddress = '127.0.0.1';

        Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;

        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            // logger.info("IP detection: skipping internal " + iface.address);
            return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                this.logger.info("IP detection: multi-address interface at " + iface.address);
                ipAddress = iface.address;
            } else {
                // this interface has only one ipv4 adress
                this.logger.info("IP detection: interface at " + iface.address);
                ipAddress =  iface.address;
            }
            ++alias;
        });
        });
    }

}
