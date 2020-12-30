import fastify, {FastifyInstance} from 'fastify';
import createPingEndpoint from './endpoints/ping';
import { addRoutes } from './utils';
import {createRegionBusinessesEndpoint, createBusinessesEndpoint} from "./endpoints/businesses";
import createRegionsEndpoint from "./endpoints/regions";
import {productionDataLayer} from "./database/productionDataLayer";
import createFiltersEndpoint from "./endpoints/filters";
import {registerAuth0} from "./auth0";

const port = Number(process.env.PORT || 8080);
const server = addRoutes(
  fastify(),
  createPingEndpoint,
  (app: FastifyInstance) => createFiltersEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createRegionsEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createBusinessesEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createRegionBusinessesEndpoint(app, productionDataLayer)
);

registerAuth0(server);

server.listen(port, '::', (err, address) => {
  if (err) {
    console.error(err);
    process.exitCode = 1;
  } else {
    console.log(`Server listening at ${address}`);
  }
});
