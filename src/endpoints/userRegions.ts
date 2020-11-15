import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {firestore} from "../database/firestore";

interface UserRegionsRequest extends RequestGenericInterface {
  Params: {
    userId: string
  }
}

export default function createUserRegionsEndpoint(app: FastifyInstance) {
  app.get<UserRegionsRequest>('/users/:userId/regions',
  async (request) => {
      let userId = request.params.userId;
      let response = {
        status: "ok",
        date: Date.now(),
        user: userId,
        regions: <any>[]
      }
      let regionsSnapshot = await firestore.collection("regions").where("manager", "==", userId).get();
      response.regions = await regionsSnapshot.docs.map((b) => ({'id': b.id, 'data': b.data()}));
      return JSON.stringify(response);
    }
  );

  return app;
}
