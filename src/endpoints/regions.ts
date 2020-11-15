import type { FastifyInstance } from 'fastify';
import {firestore} from "../database/firestore";

export default function createRegionsEndpoint(app: FastifyInstance) {
  app.get('/regions',
    async () => {
      let response = {
        status: "ok",
        date: Date.now(),
        regions: <any>[]
      }
      let regionsSnapshot = await firestore.collection("regions").get();
      response.regions = await regionsSnapshot.docs.map((r) => ({'id': r.id, 'data': r.data()}));
      console.log(response);
      return JSON.stringify(response);
    }
  );

  return app;
}
