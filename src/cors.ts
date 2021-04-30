import {FastifyInstance} from "fastify";
import fastifyCors from "fastify-cors";

export function registerCorsHandler(server: FastifyInstance) {
  server.register(fastifyCors, {
    origin: [/^https?:\/\/localhost/, /^https?:\/\/ranlab-app-phzez.ondigitalocean.app/],
    credentials: true,
    strictPreflight: true
  });
}
