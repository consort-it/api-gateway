import * as restify from 'restify';
import { logger } from '../services/logger';

export default class HealthController {
	public get(req: restify.Request, res: restify.Response, next: restify.Next) {

        logger.info("GET health");
    
		// standard Spring Boot unauthenticated info
   	    res.json(200, {"status":"UP"});

		// could be extended to a more verbose format (if needed)
		//
		// https://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-monitoring.html#production-ready-health-access-restrictions
 
	}
}