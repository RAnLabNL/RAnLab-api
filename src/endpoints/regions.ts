import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Region} from "../database/productionDataLayer";

interface GetManagedRegionsRequest extends RequestGenericInterface {
  Params: {
    managerId: string
  }
}

export default function createRegionsEndpoint(app: FastifyInstance, dataLayer : DataLayer) {
  app.get<GetManagedRegionsRequest>('/regions/:managerId',
    async (request) => {
      let response = {
        status: "ok",
        date: Date.now(),
        regions: <Region[]>[]
      }
      response.regions = await dataLayer.getRegionsManagedBy(request.params.managerId);
      return JSON.stringify(response);
    }
  );

  return app;
}
