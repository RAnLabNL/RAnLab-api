import fastify, {FastifyInstance} from 'fastify';
import fastifySensible from "fastify-sensible";
import createPingEndpoint from './endpoints/ping';
import { addRoutes } from './utils';
import { createBusinessesEndpoint} from "./endpoints/businesses";
import createRegionsEndpoint from "./endpoints/regions";
import {productionDataLayer} from "./database/productionDataLayer";
import {createFiltersEndpoint} from "./endpoints/filters";
import {registerAuth0} from "./auth0";
import {registerCorsHandler} from "./cors";
import {registerSwagger} from "./swagger";

const port = Number(process.env.PORT || 8080);
const server = fastify();
server.register(fastifySensible);
registerSwagger(server);
registerAuth0(/*server*/);
registerCorsHandler(server);
addRoutes(
  server,
  createPingEndpoint,
  (app: FastifyInstance) => createFiltersEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createRegionsEndpoint(app, productionDataLayer),
  (app: FastifyInstance) => createBusinessesEndpoint(app, productionDataLayer)
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
