import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Filters} from "../database/productionDataLayer";
import {
  addIndustriesSchema,
  deleteIndustriesSchema,
  getAllIndustriesSchema,
  getFilterSchema
} from "./docs/filterSchemas";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest} from "./endpointUtils";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: string
  }
}

interface IndustriesRequest extends AuthenticatedRequest {
  Body: {
    industries: string[]
  }
}

export function createFiltersEndpoint(app: FastifyInstance, dataLayer: DataLayer, verifyJwt: Auth0JwtVerifier) {
  app.get<GetFiltersRequest>('/regions/:regionId/filters', {schema: getFilterSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("User not found!");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          filters: <Filters | null>null
        }
        response.filters = await dataLayer.getFilters(request.params.regionId);
        return JSON.stringify(response);
      }
    }
  );

  app.get("/filters/industries", {schema: getAllIndustriesSchema},
    async (request, reply) =>{
      let {userAppId} = await verifyJwt(request);
      if(!userAppId) {
        reply.unauthorized("Must be logged in to access this data");
        return;
      } else {
        try {
          let response = {
            status: "ok",
            date: Date.now(),
            industries: <string[]>[]
          };
          let regions = await dataLayer.getAllRegions();
          let industries: string[] = [];
          for (let i = 0; i < regions.length; i++) {
            let filters = await dataLayer.getFilters(regions[i].id);
            if (!!filters && !!filters.industries) {
              industries.push(...filters.industries);
            }
          }
          let globalIndustries = (await dataLayer.getFilters()).industries ?? [];
          industries.push(...globalIndustries);
          // Get just unique values
          response.industries = Array.from(new Set(industries));

          return JSON.stringify(response);
        } catch (e) {
          console.log(e);
          throw e;
        }
      }
    }
  )

  app.post<IndustriesRequest>(
    "/filters/industries",
    {schema: addIndustriesSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Must be logged in to access this data");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now()
        };

        await dataLayer.addIndustries(request.body.industries);
        return JSON.stringify(response);
      }
    });

  app.delete<IndustriesRequest>(
    "/filters/industries",
    {schema: deleteIndustriesSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if (!userAppId) {
        reply.unauthorized("Must be logged in to perform this operation");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now()
        };

        await dataLayer.deleteIndustries(request.body.industries);
        return JSON.stringify(response);
      }
    });

    return app;
}
