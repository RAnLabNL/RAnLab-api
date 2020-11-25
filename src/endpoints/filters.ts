import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {firestore} from "../database/firestore";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: number
  }
}

export default function createFiltersEndpoint(app: FastifyInstance) {
  app.get<GetFiltersRequest>('/filters',
    async () => {
      let response = {
        status: "ok",
        date: Date.now(),
        years: <number[]>[]
      }
      let yearsSnapshot = await firestore.collection("years").get();
      response.years = await yearsSnapshot.docs.map((b) => Number.parseInt(b.id));
      console.log(response);
      return JSON.stringify(response);
    }
  );

  return app;
}
