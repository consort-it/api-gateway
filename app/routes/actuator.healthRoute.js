"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const HealthController_1 = require("../controllers/HealthController");
var jwt = require('express-jwt');
function healthRoute(api) {
    let healthCtrl = new HealthController_1.default();
    api.get('/health', healthCtrl.get);
}
module.exports.routes = healthRoute;
//# sourceMappingURL=actuator.healthRoute.js.map