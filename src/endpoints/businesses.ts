import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Filters} from "../database/productionDataLayer";
import firebase from "firebase";
import GeoPoint = firebase.firestore.GeoPoint;

interface GetRegionBusinessRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  },
  Headers: {
    access_token: string
  }
}

interface CreateBusinessRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  },
  Body: Business,
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
  regionId: string;
  industry: string;
  year_added: number;
  location?: GeoPoint | null | undefined
}

interface AuthToken {
  userId: string,
  admin: boolean
}
async function isRegionManager(userId: string, regionId: string, dataLayer: DataLayer) {
  const regions = (await dataLayer.getRegionsManagedBy(userId));
  return  regions.find((r) => r.name === regionId);
}

export function createBusinessesEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.get<GetRegionBusinessRequest>('/regions/:regionId/businesses',
    async (request) => {

      let {userId, admin} = <AuthToken>await request.jwtVerify();
      if(!(admin || await isRegionManager(userId, request.params.regionId,  dataLayer))) {
        throw app.httpErrors.unauthorized("User does not have access to region");
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          region: request.params.regionId,
          businesses: <Business[]>[],
          pageStart: "1",
          pageEnd: "2",
          filters: <Filters>{}
        };

        response.businesses = (await dataLayer.getBusinessesByRegion(request.params.regionId)).slice(0, 10);
        response.filters = await dataLayer.getFilters(request.params.regionId);
        return JSON.stringify(response);
      }
    }
  );

  app.post<CreateBusinessRequest>(
    '/regions/:regionId/businesses',
    async (request) => {

      let {userId, admin} = <AuthToken>await request.jwtVerify();
      if(!(admin || await isRegionManager(userId, request.params.regionId, dataLayer))) {
        throw app.httpErrors.unauthorized("User does not have access to region");
      } else  if (!!request.body.regionId && request.body.regionId !== request.params.regionId) {
        throw app.httpErrors.badRequest("Region ID mismatch between route and body ");
      } else {
        let businessRef = await dataLayer.setBusiness(request.body);
        let response = {
          status: "ok",
          date: Date.now(),
          businessId: businessRef.id
        };
        return JSON.stringify(response);
      }
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
