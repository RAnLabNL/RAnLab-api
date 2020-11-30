import fastify, {FastifyInstance} from 'fastify';
import createPingEndpoint from './endpoints/ping';
import { addRoutes } from './utils';
import createRegionBusinessesEndpoint from "./endpoints/businesses";
import createRegionsEndpoint from "./endpoints/regions";
import {productionDataLayer} from "./database/productionDataLayer";
import createFiltersEndpoint from "./endpoints/filters";

const port = Number(process.env.PORT || 8080);
const server = addRoutes(
  fastify(),
  createPingEndpoint,
  (app: FastifyInstance) => createFiltersEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createRegionBusinessesEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createRegionsEndpoint(app, productionDataLayer)
);

server.listen(port, '::', (err, address) => {
  if (err) {
    console.error(err);
    process.exitCode = 1;
  } else {
    console.log(`Server listening at ${address}`);
  }
});
