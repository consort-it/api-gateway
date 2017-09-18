"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./../services/logger");
/** maps an arbitrary url to an service */
class UrlRewriter {
    constructor(routes) {
        this.routes = routes;
        // passed array of all rewrite routes from outside
    }
    /** rewrite a single url */
    redirectToService(url) {
        var matchedRoute = this.routes.find((route, dex, arr) => {
            return (url.toLowerCase().startsWith(route.inPath));
        });
        if (matchedRoute) {
            logger_1.logger.debug("Matched url prefix " + matchedRoute.inPath + " --> " + matchedRoute.serviceNameVersion);
            return matchedRoute.serviceNameVersion;
        }
        else {
            return null;
        }
    }
}
exports.UrlRewriter = UrlRewriter;
//# sourceMappingURL=url-rewriter.js.map