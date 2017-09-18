export class ServiceRoute {

    inPath: string;               // url to listen to (starting with /)
    serviceNameVersion: string;   // service to route to (including major version)

    constructor(_inPath: string, _serviceNameVersion: string) {
        this.inPath = _inPath;
        this.serviceNameVersion = _serviceNameVersion;
    }

}
