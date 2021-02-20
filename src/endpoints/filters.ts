import type {FastifyInstance, RequestGenericInterface} from 'fastify';
import {DataLayer, Filters} from "../database/productionDataLayer";
import {getAllIndustriesSchema, getFilterSchema} from "./docs/filterSchemas";
import {Auth0JwtVerifier} from "../auth0";

interface GetFiltersRequest extends RequestGenericInterface {
  Params: {
    regionId: string
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
      let {admin} = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admins have access to this data");
        return;
      } else {
        let response = {
          status: "ok",
          date: Date.now(),
          industries: <string[]> []
        };
        let regions = await dataLayer.getAllRegions();
        regions.forEach((r) => {
          if (!!r.filters && !!r.filters.industries) {
            r.filters.industries.forEach((f_i) => {
              if(!!f_i.industry) {
                if (!response.industries.find((r_i) => r_i === f_i.industry)) {
                  response.industries.push(f_i.industry);
                }
              }
            })
          }
        });

        return JSON.stringify(response);
      }
    }
  )

  return app;
}
