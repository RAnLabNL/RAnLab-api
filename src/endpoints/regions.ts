import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Region} from "../database/productionDataLayer";
import {
  getManagedRegionsReqSchema,
  getSingleRegionReqSchema,
  createRegionReqSchema,
  updateRegionReqSchema,
  deleteRegionReqSchema
} from "./docs/regionSchemas";
import {verifyJwt} from "../auth0";
import {isRegionManager} from "../utils";

interface GetManagedRegionsRequest extends RequestGenericInterface {
  Params: {
    managerId: string
  }
}

interface GetSingleRegionRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  }
}

interface CreateRegionRequest extends RequestGenericInterface {
  Body: Region
}

interface DeleteRegionRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  }
}

interface UpdateRegionRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  },
  Body: Region
}

export default function createRegionsEndpoint(app: FastifyInstance, dataLayer : DataLayer) {
  app.get<GetManagedRegionsRequest>(
    '/regions/manager/:managerId',
    {schema: getManagedRegionsReqSchema},
    async (request,reply) => {
      let {userId, admin} = await verifyJwt(request);
      if(!userId) {
        reply.send(reply.unauthorized);
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          regions: <Region[]>[]
        };
        if (admin || userId == request.params.managerId) {
          response.regions.push(...(await dataLayer.getRegionsManagedBy(userId)));
        }
        return JSON.stringify(response);
      }
    }
  );

  app.get<GetSingleRegionRequest>(
    '/regions/:regionId',
    {schema: getSingleRegionReqSchema},
    async(request ) => {

      let {userId, admin} = await verifyJwt(request);
      let response = {
        status: "ok",
        date: Date.now(),
        region: <Region | null>null
      }
      let regions : Region[] ;
      if(admin) {
        regions = (await dataLayer.getAllRegions());
      } else {
        regions = (await dataLayer.getRegionsManagedBy(userId));
      }
      let region: Region | undefined = regions.find((r => r.name == request.params.regionId))
      response.region = !!region ? region : null;
      return JSON.stringify(response);
    }
  );

  app.post<CreateRegionRequest>(
    '/regions',
    {schema: createRegionReqSchema},
    async(request, reply) => {
      let {admin} = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Must be admin to create a region");
        return;
      } else {
        let response = {
          status: "ok",
          regionId: ""
        };
        response.regionId = (await dataLayer.setRegion(request.body)).id;
        reply.code(201);
        return JSON.stringify(response);
      }
    }
  );

  app.post<UpdateRegionRequest>(
    '/regions/:regionId',
    {schema: updateRegionReqSchema},
    async(request, reply) => {
      let {userId, admin} = await verifyJwt(request);
      if(!(admin || await isRegionManager(userId, request.params.regionId, dataLayer))) {
        reply.unauthorized("Only region managers and administrators can update region data")
        return;
      } else {
        let UpdatedRegion: Region = <Region>{...request.body};
        let response = {
          status: "ok",
          region: UpdatedRegion
        };
        await dataLayer.setRegion(UpdatedRegion);
        return JSON.stringify(response);
      }
    }
  );

  app.delete<DeleteRegionRequest>(
    '/regions/:regionId',
    {schema: deleteRegionReqSchema},
    async (request, reply) => {
      let {userId} = <{userId:string}>await request.jwtVerify();
      if((await dataLayer.getRegionsManagedBy(userId)).find((r) => r.name === request.params.regionId)) {
        await dataLayer.deleteRegion(request.params.regionId);
        reply.code(204);
      } else {
        reply.code(401);
      }
    }
  );
  return app;
}
