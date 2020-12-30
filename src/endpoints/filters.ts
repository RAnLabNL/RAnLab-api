import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer} from "../database/productionDataLayer";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  }
}

export function createFiltersEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.get<GetFiltersRequest>('/filters',
    async (request) => {
      let response = {
        status: "ok",
        date: Date.now(),
        years: <number[] | undefined> []
      }

      response.years = (await dataLayer.getFilters(request.params.regionId)).years;
      return JSON.stringify(response);
    }
  );

  return app;
}
