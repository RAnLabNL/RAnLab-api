import fastify, {FastifyInstance} from 'fastify';
import fastifySensible from "fastify-sensible";
import MemcachePlus from "memcache-plus";

import createPingEndpoint from './endpoints/ping';
import { addRoutes } from './utils';
import { createBusinessesEndpoint} from "./endpoints/businesses";
import createRegionsEndpoint from "./endpoints/regions";
import {ProductionDataLayer} from "./database/productionDataLayer";
import {createFiltersEndpoint} from "./endpoints/filters";
import {registerCorsHandler} from "./cors";
import {registerSwagger} from "./swagger";
import {getJwtVerifier} from "./auth0";
import {createEditEndpoint} from "./endpoints/editRequest";
import {productionFirestore} from "./database/firestore";
import createUsersEndpoint from "./endpoints/users";
import {createCacheEndpoint} from "./endpoints/cache";

let productionDataLayer = new ProductionDataLayer(productionFirestore)
const port = Number(process.env.PORT || 8080);
const server = fastify({logger: true});
server.register(fastifySensible);
registerSwagger(server);
registerCorsHandler(server);

let productionCache = new MemcachePlus();
let prodJwtVerifier = getJwtVerifier(productionCache);
addRoutes(
  server,
  createPingEndpoint,
  (app: FastifyInstance) => createFiltersEndpoint(app, productionDataLayer, prodJwtVerifier),
  (app: FastifyInstance) => createRegionsEndpoint(app, productionDataLayer, prodJwtVerifier),
  (app: FastifyInstance) => createBusinessesEndpoint(app, productionDataLayer, prodJwtVerifier),
  (app: FastifyInstance) => createEditEndpoint(app, productionDataLayer, prodJwtVerifier),
  (app: FastifyInstance) => createUsersEndpoint(app, prodJwtVerifier),
  (app: FastifyInstance) => createCacheEndpoint(app, prodJwtVerifier, productionCache)
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
