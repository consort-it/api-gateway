"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
var assert = chai.assert;
const supertest = require("supertest");
const sinon = require("sinon");
let expect = chai.expect;
// helpers:
var https = require('https');
// env for subject under test
process.env.ENV = "test";
// hello-world-api-client (Auth0.com):
process.env.SVC_PORT = 3007;
process.env.IP = "127.0.0.1";
process.env.LOG_LEVEL = "debug";
// subject under test
const api_gateway2_1 = require("../../app/api-gateway2");
// chai - list of assertions: http://chaijs.com/api/assert/
describe("API Gateway", function () {
    let sandbox = sinon.sandbox.create();
    let logInfoStub;
    it("TestEngine: Expect chai it to return true", function () {
        assert.isTrue(true);
    });
    it("TestEngine: Expect chai to return false", function () {
        assert.isFalse(false);
    });
    it("Health-Controller: Should return http 200", function (done) {
        supertest(api_gateway2_1.apiGateway.actuators)
            .get('/health')
            .end((err, response) => {
            if (err) {
                throw new Error("fail");
            }
            else {
                expect(response.status).to.equal(200);
                done();
            }
        });
    });
    it("Health-Controller: Should return JSON status: UP", function (done) {
        supertest(api_gateway2_1.apiGateway.actuators)
            .get('/health')
            .end((err, response) => {
            if (err) {
                throw new Error("fail");
            }
            else {
                assert.deepEqual(response.body, { 'status': 'UP' }, "JSON object has wrong format");
                done();
            }
        });
    });
    it("Gateway: Should return http 400 for non api requests", function (done) {
        supertest(api_gateway2_1.apiGateway.gateway)
            .get('/opi/v2/bla')
            .end((err, response) => {
            if (err) {
                throw new Error("fail");
            }
            else {
                expect(response.status).to.equal(400);
                done();
            }
        });
    });
    it("Gateway: Should return http 400 for less than three uri segments", function (done) {
        supertest(api_gateway2_1.apiGateway.gateway)
            .get('/api')
            .end((err, response) => {
            if (err) {
                throw new Error("fail");
            }
            else {
                expect(response.status).to.equal(400);
                done();
            }
        });
    });
    it("Gateway: Should return http 200 for regular api request", function (done) {
        supertest(api_gateway2_1.apiGateway.gateway)
            .get('/api/v1/unit-test')
            .end((err, response) => {
            if (err) {
                throw new Error("fail");
            }
            else {
                expect(response.status).to.equal(200);
                done();
            }
        });
    });
    it("Gateway: Should return http 404 for unknown api request", function (done) {
        supertest(api_gateway2_1.apiGateway.gateway)
            .get('/api/v1/xnit-test')
            .end((err, response) => {
            if (err) {
                throw new Error("fail");
            }
            else {
                expect(response.status).to.equal(404);
                done();
            }
        });
    });
    // attention: not an API-Test (application/json) --> text/plain
    it('Gateway: Should return fixed content (plain) for regular api request', function (done) {
        supertest(api_gateway2_1.apiGateway.gateway)
            .get('/api/v1/unit-test')
            .expect('Data for unit test.', done);
    });
    // attention: not an API-Test (application/json) --> text/plain
    it('Gateway: Should contain x-span-id and x-trace-id headers', function (done) {
        supertest(api_gateway2_1.apiGateway.gateway)
            .get('/api/v1/unit-test')
            .end(function (err, result) {
            assert.isNotNull(result.headers["x-span-id"]);
            assert.isNotNull(result.headers["x-trace-id"]);
            done();
        });
    });
});
//# sourceMappingURL=AllControllers.spec.js.map