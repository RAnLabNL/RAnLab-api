import {FastifyInstance} from "fastify";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest} from "./endpointUtils";
import {emptyCacheSchema} from "./docs/cacheSchemas";
import {DataLayer} from "../database/productionDataLayer";

export function createCacheEndpoint(app: FastifyInstance, verifyJwt: Auth0JwtVerifier, cache: DataLayer) {
  app.post<AuthenticatedRequest>(
    "/cache/empty",
    {schema: emptyCacheSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Must be logged in to use this endpoint");
        return;
      } else {
        await cache.cleanCachedUsers();
        return {
          status: "Cache emptied",
          date: Date.now()
        }
      }
    }
  );
  return app;
}
