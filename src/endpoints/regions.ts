import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Region} from "../database/productionDataLayer";

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
  app.get<GetManagedRegionsRequest>('/regions',
    async (request) => {
      let {userId, admin}  = <{userId:string, admin: boolean}>await request.jwtVerify();
      let response = {
        statusCode: 200,
        status: "ok",
        date: Date.now(),
        regions: <Region[]>[]
      }
      if(admin) {
        response.regions.push(...(await dataLayer.getAllRegions()));
      } else {
        response.regions.push(...(await dataLayer.getRegionsManagedBy(userId)));
      }
      return JSON.stringify(response);
    }
  );

  app.post<CreateRegionRequest>('/regions',
    async(request, reply) => {
      let response = {
        status: "ok",
        region: request.body.name
      };
      await dataLayer.setRegion(request.body);
      reply.code(201);
      return JSON.stringify(response);
    }
  );

  app.get<GetSingleRegionRequest>('/regions/:regionId',
    async(request ) => {
      let {userId, admin}  = <{userId:string, admin: boolean}>await request.jwtVerify();
      let response = {
        statusCode: 200,
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

  app.post<UpdateRegionRequest>('/regions/:regionId',
    async(request) => {
      let UpdatedRegion: Region = <Region>{...request.body};
      let response = {
        status: "ok",
        region: UpdatedRegion
      };
      await dataLayer.setRegion(UpdatedRegion);
      return JSON.stringify(response);
    }
  );

  app.delete<DeleteRegionRequest>('/regions/:regionId',
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
