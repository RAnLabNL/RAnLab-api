import {FastifyInstance } from "fastify";
import {DataLayer} from "../database/productionDataLayer";
import {Business} from "./businesses";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest, AuthenticatedRequestByRegionId} from "./endpointUtils";
import {isRegionManager} from "../utils";
import {
  createEditRequestSchema,
  getAllEditRequestsSchema,
  getEditRequestsByRegionSchema
} from "./docs/editRequestSchemas";

export interface EditRequest {
  id?: string,
  regionId: string,
  submitter: string,
  dateSubmitted: Date | string,
  dateUpdated: Date | string
  status: string,
  adds?: Business[],
  updates?: Business[] | undefined,
  deletes?: string[] | undefined
}

interface CreateEditRequest extends AuthenticatedRequestByRegionId {
  Body: EditRequest
}

export function createEditEndpoint(app: FastifyInstance, dataLayer: DataLayer, verifyJwt: Auth0JwtVerifier) {
  app.get<AuthenticatedRequestByRegionId>(
    `/region/:regionId/edits`,
    {schema: getEditRequestsByRegionSchema},
    async (request, reply) => {
      let {userAppId, admin} = await verifyJwt(request);
      if(!admin && !userAppId && !(await isRegionManager(userAppId, request.params.regionId, dataLayer))) {
        reply.unauthorized("Must be logged in to submit requests");
        return;
      } else {
        let response = {
          status: "ok",
          editRequests: <EditRequest[]>[]
        }
        response.editRequests = await dataLayer.getEditRequestsForRegion(request.params.regionId)
        return JSON.stringify(response);
      }
    }
  );

  app.get<AuthenticatedRequest>(
    "/edits/all",
    {schema: getAllEditRequestsSchema},
    async (request, reply) => {
      let { admin } = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admins may access this data!");
        return;
      } else {
        let response = {
          status: "ok",
          editRequests: await dataLayer.getAllEditRequests()
        }
        return JSON.stringify(response);
      }
    }
  );

  app.post<CreateEditRequest>(
    '/region/:regionId/edits',
    {schema: createEditRequestSchema},
    async (request, reply) => {
      let {userAppId, admin} = await verifyJwt(request);
      if(!admin && !userAppId && !(await isRegionManager(userAppId, request.params.regionId, dataLayer))) {
        reply.unauthorized("Must be logged in to submit requests");
        return;
      } else {
        const incomingRequest = request.body;
        let response = {
          status: "ok",
          id: (await dataLayer.createEditRequest(incomingRequest)).id
        };
        reply.code(201);
        return JSON.stringify(response);
      }
    }
  );
  return app;
}
