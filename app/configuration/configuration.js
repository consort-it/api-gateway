"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require('http');
const logger_1 = require("./../services/logger");
/** Read configuration from spring cloud config server */
class Configuration {
    readConfig() {
        return new Promise((resolve, reject) => {
            http.get({
                hostname: process.env.CONFIG_SERVER_HOST,
                port: process.env.CONFIG_SERVER_PORT,
                path: process.env.CONFIG_SERVER_PATH,
                agent: false // create a new agent just for this one request
            }, (res) => {
                const statusCode = res.statusCode;
                const contentType = res.headers['content-type'];
                if (statusCode !== 200) {
                    res.resume();
                    reject(new Error(`Request Failed.\n` + `Status Code: ${statusCode}`));
                }
                else if (!/^application\/json/.test(contentType)) {
                    res.resume();
                    reject(new Error(`Invalid content-type.\n` + `Expected application/json but received ${contentType}`));
                }
                res.setEncoding('utf8');
                let rawData = '';
                res.on('error', err => reject(err));
                res.on('data', (chunk) => rawData += chunk);
                res.on("end", function () {
                    try {
                        let parsedData = JSON.parse(rawData);
                        logger_1.logger.debug("Received configuration from spring cloud config");
                        // because of hierarchical configuration we've to find the lowest level (our own config)
                        var config = parsedData['propertySources'].find((itm) => {
                            return itm.name.endsWith("api-gateway.yml");
                        }).source;
                        resolve(JSON.parse(config.routes));
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        });
    }
}
exports.Configuration = Configuration;
//# sourceMappingURL=configuration.js.map