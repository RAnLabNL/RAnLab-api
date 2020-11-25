import {firestore} from "../database/firestore";
import {FastifyInstance, RequestGenericInterface} from "fastify";
import firebase from "firebase";
import GeoPoint = firebase.firestore.GeoPoint;

interface CreateBusinessRequest extends RequestGenericInterface {
  Body: Business
}

export interface Business {
  id: string | undefined;
  name: string;
  employees: number;
  region: string;
  year_added: number;
  location: GeoPoint
}

export default function createBusinessesEndpoint(app: FastifyInstance)  {
  app.post<CreateBusinessRequest>(
  '/businesses',
  async (request) => {
    let bc = firestore.collection("businesses");
    let businessRef = request.body.id ? bc.doc(request.body.id) : bc.doc();
    await businessRef.set(request.body);
    await firestore.collection("years").doc(`${request.body.year_added}`).set({});
      await firestore.collection("regions").doc(request.body.region).set({});
    let response = {
      status: "ok",
      date: Date.now(),
      businessId: businessRef.id
    };
    return JSON.stringify(response);
  });
  return app;
}
