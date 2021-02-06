import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Filters} from "../database/productionDataLayer";
import {getFilterSchema} from "./docs/filterSchemas";
import {verifyJwt} from "../auth0";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  }
}

export function createFiltersEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.get<GetFiltersRequest>('/regions/:regionId/filters', {schema: getFilterSchema},
    async (request, reply) => {
      let {userId} = await verifyJwt(request);
      if (!userId) {
        reply.unauthorized("User not found!");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          filters: <Filters | null>null
        }
        response.filters = await dataLayer.getFilters(request.params.regionId);
        return JSON.stringify(response);
      }
    }
  );

  return app;
}
