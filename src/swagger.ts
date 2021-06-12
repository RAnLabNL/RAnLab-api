import {FastifyInstance} from "fastify";
import fastifySwagger from "fastify-swagger";

const swaggerSchema = {
  routePrefix: '/documentation',
  openapi: {
    info: {
      title: 'RAnLabAPI Swagger Schema',
      description: 'Swagger Schema for the RAnLab API ',
      version: '0.1.0'
    },
    servers: [
      {url: "http://localhost:8080", description: "Local dev"},
      {url: "https://ranlab-api-mvp-xxvyt3l5wa-nn.a.run.app/", description: "Cloud dev"}
    ]
  },
  exposeRoute: true
};
export function registerSwagger(app: FastifyInstance) {
  app.register(fastifySwagger, swaggerSchema);
}
