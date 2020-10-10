import fastify from 'fastify';
import createPingEndpoint from './endpoints/ping';
import { addRoutes } from './utils';

const port = Number(process.env.PORT || 8080);
const server = addRoutes(
  fastify(),
  createPingEndpoint,
);

server.listen(port, '::', (err, address) => {
  if (err) {
    console.error(err);
    process.exitCode = 1;
  } else {
    console.log(`Server listening at ${address}`);
  }
});
