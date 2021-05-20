import {FastifyInstance} from "fastify";
import {Auth0JwtVerifier, removeUserFromCache} from "../auth0";
import {AuthenticatedRequest} from "./endpointUtils";
import {emptyCacheSchema} from "./docs/cacheSchemas";

export function createCacheEndpoint(app: FastifyInstance, verifyJwt: Auth0JwtVerifier) {
  app.post<AuthenticatedRequest>(
    "/cache/empty",
    {schema: emptyCacheSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Must be logged in to use this endpoint");
      } else {
        removeUserFromCache(request)
      }
    }
  );
  return app;
}
