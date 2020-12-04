import type { FastifyInstance } from 'fastify';

type EndpointFunction = (s: FastifyInstance) => FastifyInstance;

/**
 * Returns a Fastify instance composed of all the given endpoints
 *
 * @param server - the Fastify instance to build on
 * @param endpoints - a list of endpoint creators
 * @returns the built Fastify instance
 */
export function addRoutes(server: FastifyInstance, ...endpoints: EndpointFunction[]) {
  return endpoints.reduce((prev, curr) => curr(prev), server);
}
