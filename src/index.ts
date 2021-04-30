import fastify, {FastifyInstance} from 'fastify';
import fastifySensible from "fastify-sensible";
import createPingEndpoint from './endpoints/ping';
import { addRoutes } from './utils';
import { createBusinessesEndpoint} from "./endpoints/businesses";
import createRegionsEndpoint from "./endpoints/regions";
import {ProductionDataLayer} from "./database/productionDataLayer";
import {createFiltersEndpoint} from "./endpoints/filters";
import {registerCorsHandler} from "./cors";
import {registerSwagger} from "./swagger";
import {verifyJwt} from "./auth0";
import {createEditEndpoint} from "./endpoints/editRequest";
import {productionFirestore} from "./database/firestore";
import createUsersEndpoint from "./endpoints/users";

let productionDataLayer = new ProductionDataLayer(productionFirestore)
const port = Number(process.env.PORT || 8080);
const server = fastify({logger: true});
server.register(fastifySensible);
registerSwagger(server);
registerCorsHandler(server);
addRoutes(
  server,
  createPingEndpoint,
  (app: FastifyInstance) => createFiltersEndpoint(app, productionDataLayer, verifyJwt),
  (app: FastifyInstance) => createRegionsEndpoint(app, productionDataLayer, verifyJwt),
  (app: FastifyInstance) => createBusinessesEndpoint(app, productionDataLayer, verifyJwt),
  (app: FastifyInstance) => createEditEndpoint(app, productionDataLayer, verifyJwt),
  (app: FastifyInstance) => createUsersEndpoint(app, verifyJwt)
);

server.listen(port, '::', (err, address) => {
  if (err) {
    console.error(err);
    process.exitCode = 1;
  } else {
    console.log("listening")
    server.swagger();
    console.log(`Server listening at ${address}`);
  }
});
