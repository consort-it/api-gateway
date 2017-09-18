import * as restify from 'restify';
import healthController from '../controllers/HealthController'

var jwt = require('express-jwt');

function healthRoute(api:restify.Server) {

  let healthCtrl = new healthController();
  
  api.get('/health',
          healthCtrl.get )
}

module.exports.routes = healthRoute;