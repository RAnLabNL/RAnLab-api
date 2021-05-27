import {FastifyInstance} from "fastify";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest} from "./endpointUtils";
import {emptyCacheSchema} from "./docs/cacheSchemas";
import {Client} from "memjs";

export function createCacheEndpoint(app: FastifyInstance, verifyJwt: Auth0JwtVerifier, cache: Client) {
  app.post<AuthenticatedRequest>(
    "/cache/empty",
    {schema: emptyCacheSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Must be logged in to use this endpoint");
        return;
      } else {
        await cache.flush();
        return {
          status: "Cache emptied",
          date: Date.now()
        }
      }
    }
  );
  return app;
}
