"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var consul = require('consul')({ host: 'consul', promisify: true });
const logger_1 = require("./../services/logger");
// find a service in the consul service registry
//
class ConsulRegistry {
    findService(nameAndVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            var addr = yield this.lookupInConsul(nameAndVersion);
            return addr;
        });
    }
    lookupInConsul(nameAndVersion) {
        return new Promise((resolve) => {
            if (nameAndVersion == "unit-test-v1") {
                resolve("unit-test-v1:999");
                return;
            }
            logger_1.logger.debug("Query consul for '" + nameAndVersion + "'");
            consul.catalog.service.nodes(nameAndVersion, function (err, consulServices) {
                if (err) {
                    logger_1.logger.error('Error getting node info from consul:' + err);
                    resolve(null);
                }
                else {
                    /* example return value for consulServices:
                    [
                        {
                            "Node": "node1",
                            "Address": "127.0.0.1",
                            "ServiceID": "example",
                            "ServiceName": "example",
                            "ServiceTags": [
                            "dev",
                            "web"
                            ],
                            "ServicePort": 80
                        }
                    ]
                    */
                    if (consulServices.length > 0) {
                        var addr = consulServices[0].ServiceName + ":" + consulServices[0].ServicePort;
                        resolve(addr); // found
                    }
                    resolve(null);
                }
            });
        });
    }
}
exports.ConsulRegistry = ConsulRegistry;
exports.default = new ConsulRegistry();
//# sourceMappingURL=consul.js.map