import { ServiceRoute } from './../models/service-route.model';
import { logger } from './../services/logger';

/** maps an arbitrary url to an service */
export class UrlRewriter {

    constructor(private routes: ServiceRoute[]) {
        // passed array of all rewrite routes from outside
    }

    /** rewrite a single url */
    redirectToService(url: string) : string {

          var matchedRoute = this.routes.find((route, dex, arr) => {
            return (url.toLowerCase().startsWith(route.inPath));
          });

          if (matchedRoute) {
            logger.debug("Matched url prefix " + matchedRoute.inPath + " --> " + matchedRoute.serviceNameVersion);
            return matchedRoute.serviceNameVersion;
          } else {
            return null;
          }

    }

}