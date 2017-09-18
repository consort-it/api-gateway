var CommandsFactory = require('hystrixjs').commandFactory;
import { Observable } from 'rxjs/Rx';

class CircuitBreaker {

    constructor() {
        // defaults
        process.env.serviceConcurrency = 10;
        process.env.serviceTimeout = 3000;
        process.env.serviceErrorThreshold = 50;
    }

    /** process wrapper to enable circuit breaker etc. */
    launchProcess(svc, svcPort, request) : Promise<void> {

        // cache key is svc + port
        var serviceCommand = CommandsFactory.getOrCreate(svc + ":" +svcPort)
            .circuitBreakerErrorThresholdPercentage(process.env.serviceErrorThreshold)
            .timeout(5)
            .run(request)
            .circuitBreakerRequestVolumeThreshold(process.env.serviceConcurrency)
            .circuitBreakerSleepWindowInMilliseconds(process.env.serviceTimeout)
            .statisticalWindowLength(10000)
            .statisticalWindowNumberOfBuckets(10)
            // .errorHandler(isErrorHandler)   // dig deeper what is a failure and what is not
            .build();

        return serviceCommand.execute(arguments);
    }

    /** monitoring endpoint for Hystrix dashboard */
    hystrixStreamResponse(request, response) {

        var hystrixSSEStream = require('hystrixjs').hystrixSSEStream;

        response.setHeader('Content-Type', 'text/event-stream;charset=UTF-8');
        response.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        return hystrixSSEStream.toObservable().subscribe(
            function onNext(sseData) {
                response.write('data: ' + sseData + '\n\n');
            },
            function onError(error) {
                console.log(error);
            },
            function onComplete() {
                return response.end();
            }
        );
    };
}

export var instance = new CircuitBreaker();