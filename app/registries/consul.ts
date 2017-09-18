var consul = require('consul')({ host: 'consul', promisify: true }); 
import { logger } from './../services/logger';

// find a service in the consul service registry
//
export class ConsulRegistry {

    async findService(nameAndVersion: string) {

        var addr = await this.lookupInConsul(nameAndVersion);
        return addr;
    }

    private lookupInConsul(nameAndVersion: string): Promise<string> {
       
        return new Promise<string>((resolve) => {

            if (nameAndVersion == "unit-test-v1") {
                resolve("unit-test-v1:999");
                return;
            }
            logger.debug("Query consul for '" + nameAndVersion + "'");
            consul.catalog.service.nodes(nameAndVersion, function(err, consulServices) {
                if (err) {
                    logger.error('Error getting node info from consul:' + err);
                    resolve(null);
                } else {
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
                        var addr =  consulServices[0].ServiceName + ":" + consulServices[0].ServicePort;
                        resolve(addr); // found
                    }
                    resolve(null);
                   
                } 
            });
        });
    }

}

export default new ConsulRegistry();