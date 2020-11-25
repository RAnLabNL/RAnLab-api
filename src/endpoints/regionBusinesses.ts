import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {firestore} from "../database/firestore";

interface GetRegionBusinessRequest extends RequestGenericInterface {
  Params: {
    regionId: number
  }
}

export default function createRegionBusinessesEndpoint(app: FastifyInstance) {
  app.get<GetRegionBusinessRequest>('/regions/:regionId/businesses',
    async (request) => {
      let response = {
        status: "ok",
        date: Date.now(),
        region: request.params.regionId,
        businesses: <any>[]
      }
      let businessSnapshot = await firestore.collection("businesses").where("region", "==", request.params.regionId).get();
      response.businesses = await businessSnapshot.docs.map((b) => ({'id': b.id, 'data': b.data()}));
      console.log(response);
      return JSON.stringify(response);
    }
  );

  return app;
}
