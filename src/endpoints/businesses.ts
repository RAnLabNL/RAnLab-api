import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer} from "../database/productionDataLayer";
import firebase from "firebase";
import GeoPoint = firebase.firestore.GeoPoint;

interface GetRegionBusinessRequest extends RequestGenericInterface {
  Params: {
    region: string
  }
}

interface CreateBusinessRequest extends RequestGenericInterface {
  Body: Business
}

interface UpdateBusinessRequest extends RequestGenericInterface {
  Params: {
    businessId: string
  },
  Body: Business
}

export interface Business {
  id?: string | undefined;
  name: string;
  employees: number;
  region: string;
  year_added: number;
  location?: GeoPoint | null | undefined
}


export default function createRegionBusinessesEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.get<GetRegionBusinessRequest>('/regions/:region/businesses',
    async (request) => {
      let response = {
        status: "ok",
        date: Date.now(),
        region: request.params.region,
        businesses: <Business[]>[]
      }
      response.businesses = await dataLayer.getBusinessesByRegion(request.params.region);
      return JSON.stringify(response);
    }
  );

  app.post<CreateBusinessRequest>(
    '/businesses',
    async (request) => {
      let businessRef = await dataLayer.setBusiness(request.body);
      let response = {
        status: "ok",
        date: Date.now(),
        businessId: businessRef.id
      };
      return JSON.stringify(response);
    }
  );

  app.post<UpdateBusinessRequest>(
    '/businesses/:businessId',
    async (request) => {
      let updatedBiz = {...request.body, id: request.params.businessId};
      await dataLayer.setBusiness(updatedBiz);
      let response = {
        status: "ok",
        date: Date.now(),
        business: updatedBiz
      };
      return JSON.stringify(response);
    }
  );

  return app;
}
