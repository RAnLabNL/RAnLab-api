import {FastifyInstance } from "fastify";
import {DataLayer} from "../database/productionDataLayer";
import {Business, BusinessUpdate} from "./businesses";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest, AuthenticatedRequestById, AuthenticatedRequestByRegionId} from "./endpointUtils";
import {isRegionManager} from "../utils";
import {
  createEditRequestSchema, getEditPreviewSchema,
  getEditRequestByIdSchema,
  getEditRequestsByRegionSchema, getPendingEditRequestsSchema, getReviewedEditRequestsSchema, updateEditRequestSchema
} from "./docs/editRequestSchemas";

export const URL_PENDING_EDIT_REQUESTS = "/edits/status/pending";
export const URL_REVIEWED_EDIT_REQUESTS = "/edits/status/reviewed";

export interface EditRequest {
  id?: string,
  regionId: string,
  submitter?: string,
  dateSubmitted?: Date | string,
  dateUpdated?: Date | string
  status?: string,
  adds?: Business[],
  updates?: BusinessUpdate[],
  deletes?: string[]
}


interface CreateEditRequest extends AuthenticatedRequestByRegionId {
  Body: EditRequest
}

interface UpdateEditRequest extends AuthenticatedRequestById {
  Body: EditRequest
}

export function createEditEndpoint(app: FastifyInstance, dataLayer: DataLayer, verifyJwt: Auth0JwtVerifier) {
  app.get<AuthenticatedRequestById>(
    `/edits/:id`,
    {schema: getEditRequestByIdSchema},
    async (request, reply) => {
      let {userAppId, admin} = await verifyJwt(request);
      if(!admin && !userAppId) {
        reply.unauthorized("Must be logged in to submit requests");
        return;
      } else {
        let response = {
          status: "ok",
          editRequest: <EditRequest | null>null
        }
        response.editRequest = await dataLayer.getEditRequestById(request.params.id)
        return JSON.stringify(response);
      }
    }
  );
  app.post<UpdateEditRequest>(
    `/edits/:id`,
    {schema: updateEditRequestSchema},
    async(request, reply) => {
      let {userAppId, admin} = await verifyJwt(request);
      if(!admin && !!request.body.status) {
        reply.unauthorized("Only system administrators may update edit request statuses!");
        return;
      } else if (!admin && !(await isRegionManager(userAppId, request.body.regionId, dataLayer))) {
        reply.unauthorized("Only administrators and managers may update edit requests!");
        return;
      } else {
        return {
          status: "ok",
          editRequest: await dataLayer.updateEditRequest({...request.body, id: request.params.id})
        };
      }
    }
  );

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
    URL_PENDING_EDIT_REQUESTS,
    {schema: getPendingEditRequestsSchema},
    async (request, reply) => {
      let { admin } = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admins may access this data!");
        return;
      } else {
        let response = {
          status: "ok",
          editRequests: await dataLayer.getEditRequestsByStatus("Pending")
        }
        return JSON.stringify(response);
      }
    }
  );

  app.get<AuthenticatedRequest>(
    URL_REVIEWED_EDIT_REQUESTS,
    {schema: getReviewedEditRequestsSchema},
    async (request, reply) => {
      let { admin } = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admins may access this data!");
        return;
      } else {
        let response = {
          status: "ok",
          editRequests: await dataLayer.getEditRequestsByStatus("Reviewed")
        }
        return JSON.stringify(response);
      }
    }
  );

  app.get<AuthenticatedRequestById>(
    `/edits/:id/preview`,
    {schema: getEditPreviewSchema},
    async (request, reply) => {
      let { admin } = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admins may access this data!");
        return;
      } else {
        let addedBusinesses: Business[] = [];
        let updatedBusinesses: Business[] = [];
        let deletedBusinesses: Business[] = [];
        let editRequest = await dataLayer.getEditRequestById(request.params.id);
        for(const add of editRequest?.adds || []) {
          addedBusinesses.push({...add, id: "some-id"});
        }
        for (const update of editRequest?.updates || []) {
          let biz = await dataLayer.getBusinessById(update.id)
          if(!!biz) {
            updatedBusinesses.push({...biz, ...update});
          }
        }
        for (const delId of editRequest?.deletes || []) {
          let biz = await dataLayer.getBusinessById(delId);
          if(!!biz) {
            deletedBusinesses.push(biz);
          }
        }

        let response = {
          status: "ok",
          added: addedBusinesses,
          updated: updatedBusinesses,
          deleted: deletedBusinesses
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
        incomingRequest.status = "Pending";
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
