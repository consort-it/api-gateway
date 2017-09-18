"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../services/logger");
class HealthController {
    get(req, res, next) {
        logger_1.logger.info("GET health");
        // standard Spring Boot unauthenticated info
        res.json(200, { "status": "UP" });
        // could be extended to a more verbose format (if needed)
        //
        // https://docs.spring.io/spring-boot/docs/current/reference/html/production-ready-monitoring.html#production-ready-health-access-restrictions
    }
}
exports.default = HealthController;
//# sourceMappingURL=HealthController.js.map