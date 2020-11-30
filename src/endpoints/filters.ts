import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer} from "../database/productionDataLayer";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: number
  }
}

export default function createFiltersEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.get<GetFiltersRequest>('/filters',
    async () => {
      let response = {
        status: "ok",
        date: Date.now(),
        years: <number[] | undefined> []
      }

      response.years = (await dataLayer.getFilters()).years;
      return JSON.stringify(response);
    }
  );

  return app;
}
