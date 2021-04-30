import {FastifyInstance } from "fastify";
import {DataLayer} from "../database/productionDataLayer";
import {Business, BusinessUpdate} from "./businesses";
import {Auth0JwtVerifier} from "../auth0";
import {AuthenticatedRequest, AuthenticatedRequestById, AuthenticatedRequestByRegionId} from "./endpointUtils";
import {isRegionManager} from "../utils";
import {
  createEditRequestSchema, getAllEditRequestsByStatusSchema, getEditPreviewSchema,
  getEditRequestByIdSchema, getEditRequestsByRegionSchema, updateEditRequestSchema
} from "./docs/editRequestSchemas";

export const DEFAULT_PAGE_SIZE = 25;
export const previewAddId = "[preview-id]"

export interface EditRequest {
  id?: string,
  regionId: string,
  submitter?: string,
  reviewer?: string,
  dateSubmitted?: Date | string,
  dateUpdated?: Date | string
  status?: string,
  adds?: Business[],
  updates?: BusinessUpdate[],
  deletes?: BusinessUpdate[]
}

interface CreateEditRequest extends AuthenticatedRequestByRegionId {
  Body: EditRequest
}

interface UpdateEditRequest extends AuthenticatedRequestById {
  Body: EditRequest
}

interface GetPaginatedEditsByStatusRequest extends AuthenticatedRequest {
  Querystring: {
    status: string,
    pageSize: number,
    afterId: string
  }
}

interface PaginatedQueryString {
  afterId: string,
  pageSize: number
}

interface GetPaginatedEditsRequest extends AuthenticatedRequest {
  Querystring: PaginatedQueryString
}

interface GetPaginatedEditsByRegionId extends AuthenticatedRequestByRegionId {
  Querystring: PaginatedQueryString
}


export function createEditEndpoint(app: FastifyInstance, dataLayer: DataLayer, verifyJwt: Auth0JwtVerifier) {
  const MAX_COUNT = 1000000000;

  app.get<GetPaginatedEditsRequest>(
    `/edits`,
    {schema: getEditRequestByIdSchema},
    async (request, reply) => {
      let {userAppId} = await verifyJwt(request);
      if(!userAppId) {
        reply.unauthorized("Must be logged in!");
        return;
      } else {
        let pageSize = !!request.query.pageSize && request.query.pageSize > 0 ? request.query.pageSize : DEFAULT_PAGE_SIZE;
        let response = {
          status: "ok",
          editRequests: await dataLayer.getEditRequestsByUser(userAppId, pageSize, request.query.afterId),
          totalCount: (await dataLayer.getEditRequestsByUser(userAppId, MAX_COUNT)).length
        }
        return JSON.stringify(response);
      }
    }
  );

  app.get<GetPaginatedEditsByStatusRequest>(
    "/edits/all",
    {schema: getAllEditRequestsByStatusSchema},
    async (request, reply) => {
      let { admin } = await verifyJwt(request);
      if(!admin) {
        reply.unauthorized("Only admins may access this data!");
        return;
      } else {
        let editRequests : EditRequest[];
        let totalCount: number;
        let pageSize = !!request.query.pageSize && request.query.pageSize > 0 ? request.query.pageSize : DEFAULT_PAGE_SIZE;
        if(!request.query.status) {
          editRequests = await dataLayer.getAllEditRequests(pageSize, request.query.afterId);
          totalCount = (await dataLayer.getAllEditRequests(MAX_COUNT)).length;
        } else {
          editRequests = await dataLayer.getEditRequestsByStatus(request.query.status, pageSize, request.query.afterId)
          totalCount = (await dataLayer.getEditRequestsByStatus(request.query.status, MAX_COUNT)).length;
        }
        let response = {
          status: "ok",
          editRequests,
          totalCount
        }
        return JSON.stringify(response);
      }
    }
  );

  app.get<GetPaginatedEditsByRegionId>(
    `/region/:regionId/edits`,
    {schema: getEditRequestsByRegionSchema},
    async (request, reply) => {
      let {userAppId, admin} = await verifyJwt(request);
      if(!admin && !userAppId && !(await isRegionManager(userAppId, request.params.regionId, dataLayer))) {
        reply.unauthorized("Must be logged in to submit requests");
        return;
      } else {
        let pageSize = !!request.query.pageSize && request.query.pageSize > 0 ? request.query.pageSize : DEFAULT_PAGE_SIZE;
        let response = {
          status: "ok",
          editRequests: <EditRequest[]>[],
          totalCount: 0
        }
        response.editRequests = await dataLayer.getEditRequestsForRegion(request.params.regionId, pageSize, request.query.afterId)
        response.totalCount = (await dataLayer.getEditRequestsForRegion(request.params.regionId, MAX_COUNT)).length
        return JSON.stringify(response);
      }
    }
  );

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
        if(!!request.body.status) {
          let currentRequest = await dataLayer.getEditRequestById(request.params.id);
          if (currentRequest?.status !== request.body.status) {
            if (!currentRequest?.reviewer) {
              request.body.reviewer = userAppId;
            } else {
              reply.forbidden("Cannot edit the status of a request after review has been started!")
              return;
            }
            if(request.body.status.toLowerCase() === "approved") {
              let applied = await approveAndApplyEditRequest(request.params.id, userAppId);
              if (applied) {
                let response = {
                  status: "ok",
                  ...applied
                };
                return JSON.stringify(response);
              } else {
                reply.badRequest("Unable to process approval");
                return;
              }
            }
          }
        }
        let response = {
          status: "ok",
          editRequest: await dataLayer.updateEditRequest({...request.body, id: request.params.id})
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
          addedBusinesses.push({...add, id: previewAddId});
        }
        for (const update of editRequest?.updates || []) {
          let biz = await dataLayer.getBusinessById(update.id)
          if(!!biz) {
            updatedBusinesses.push({...biz, ...update});
          }
        }
        for (const deleted of editRequest?.deletes || []) {
          let biz = await dataLayer.getBusinessById(deleted.id);
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

  async function approveAndApplyEditRequest(id: string, reviewer: string) {
    let addedBusinesses: Business[] = [];
    let updatedBusinesses: Business[] = [];
    let deletedBusinesses: Business[] = [];
    let editRequest = await dataLayer.getEditRequestById(id);
    if(!!editRequest) {
      let editPromises = <Promise<any>[]>[];
      for (const add of editRequest?.adds || []) {
        editPromises.push(dataLayer.setBusiness(add));
        addedBusinesses.push({...add, id: previewAddId});
      }
      for (const update of editRequest?.updates || []) {
        let biz = await dataLayer.getBusinessById(update.id)
        if (!!biz) {
          let updatedBiz = {...biz, ...update};
          editPromises.push(dataLayer.setBusiness(updatedBiz));
          updatedBusinesses.push(updatedBiz);
        }
      }
      for (const deleted of editRequest?.deletes || []) {
        let biz = await dataLayer.getBusinessById(deleted.id);
        if (!!biz) {
          editPromises.push(dataLayer.deleteBusiness(deleted.id));
          deletedBusinesses.push(biz);
        }
      }

      let updatedEditRequest = {...editRequest, status: "Approved", reviewer};
      editPromises.push(dataLayer.updateEditRequest(updatedEditRequest))
      await Promise.all(editPromises);
      return {
        added: addedBusinesses,
        updated: updatedBusinesses,
        deleted: deletedBusinesses,
        editRequest: updatedEditRequest
      }
    } else {
      return false;
    }
  }


  return app;

}
