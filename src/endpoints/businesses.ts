import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Filters} from "../database/productionDataLayer";
import {GeoPoint} from "@google-cloud/firestore";
import {createBizSchema, exportBusinessesSchema, getBizSchema, updateBizSchema} from "./docs/businessesSchemas";
import {isRegionManager} from "../utils";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest, AuthenticatedRequestByRegionId} from "./endpointUtils";

export const CHUNK_SIZE = 100;
export const CSV_HEADER = "'id','name','location','regionId','industry','year_added','employees','location'\n";

export function convertToCSV(businesses: Business[]) {
  let csvChunk = "";
  for(let biz of businesses) {
    csvChunk += `'${biz.id}','${biz.name}','${biz.location}','${biz.regionId}','${biz.industry}',${biz.year_added},${biz.employees},${biz.location}\n`;
  }
  return csvChunk;
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

export interface BusinessUpdate {
  id: string,
  name?: string,
  employees?: number,
  industry?: string,
  year_added?: number;
  location?: GeoPoint | null | undefined
}

export function createBusinessesEndpoint(app: FastifyInstance, dataLayer: DataLayer, verifyJwt: Auth0JwtVerifier) {

  app.get<AuthenticatedRequestByRegionId>(
    '/regions/:regionId/businesses',
    {schema: getBizSchema},
    async (request  , reply) => {

      let {userAppId, admin} = await verifyJwt(request)
      if(!(admin || await isRegionManager(userAppId, request.params.regionId, dataLayer))) {
        reply.unauthorized("User does not have access to region");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          region: request.params.regionId,
          businesses: <Business[]>[],
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
    {schema: createBizSchema},
    async (request) => {
      let {userAppId, admin} = await verifyJwt(request);
      if(!(admin || await isRegionManager(userAppId, request.params.regionId, dataLayer))) {
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
    {schema: updateBizSchema},
    async (request,reply) => {
      let {admin} = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admin users can directly update business information");
        return;
      } else {
        let updatedBiz = {...request.body, id: request.params.businessId};
        await dataLayer.setBusiness(updatedBiz);
        let response = {
          status: "ok",
          date: Date.now(),
          business: updatedBiz
        };
        return JSON.stringify(response);
      }
    }
  );

  app.get<AuthenticatedRequest>(
    '/businesses/export',
    {schema: exportBusinessesSchema},
    async (request,reply) => {
      let {admin} = await verifyJwt(request);

      if(!admin) {
        reply.unauthorized("Only admin users can export all business rows!");
        return;
      } else {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=businesses.csx'
        });

        reply.raw.write(CSV_HEADER);
        let chunk = await dataLayer.getAllBusinesses();
        while(chunk.length > 0) {
          reply.raw.write(convertToCSV(chunk));
          chunk = await dataLayer.getAllBusinesses(chunk[chunk.length-1].id);
        }
        reply.raw.end();
      }
    }
  );

  return app;
}
