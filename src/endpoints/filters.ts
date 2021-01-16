import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Filters} from "../database/productionDataLayer";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  }
}

export function createFiltersEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.get<GetFiltersRequest>('/filters/:regionId',
    async (request) => {
      let response = {
        status: "ok",
        date: Date.now(),
        filters: <Filters | null>null
      }
      response.filters = await dataLayer.getFilters(request.params.regionId);
      return JSON.stringify(response);
    }
  );

  return app;
}
