import {FastifyInstance, RequestGenericInterface} from "fastify";
import {DataLayer} from "../database/productionDataLayer";
import {Business} from "./businesses";

export interface EditRequests {
  adds: AddRequest[] | undefined,
  updates: UpdateRequest[] | undefined,
  deletes: DeleteRequest[] | undefined
}

export interface AddRequest {
  id?: string | undefined,
  business: Business
}

export interface UpdateRequest {
  id?: string | undefined,
  business: Business
}

export interface DeleteRequest {
  id?: string | undefined,
  businessId: string
}

interface CreateEditRequests extends RequestGenericInterface {
  Body: EditRequests
}

export function createEditEndpoint(app: FastifyInstance, dataLayer: DataLayer) {
  app.post<CreateEditRequests>(
    '/edits',
    async (request, reply) => {
      let response = {
        status: "ok",
        editRequests: <EditRequests>{}
      };
      let adds : AddRequest[] = [];
      const editRequests = request.body;
      if(!!editRequests.adds) {
        for(let addRequest of editRequests.adds) {
          adds.push(await dataLayer.createAddRequest(addRequest));
        }
      }
      let updates : UpdateRequest[] = [];
      if(!!editRequests.updates) {
        for(let updateRequest of editRequests.updates) {
          updates.push(await dataLayer.createUpdateRequest(updateRequest));
        }
      }
      let deletes : DeleteRequest[] = [];
      if(!!editRequests.deletes) {
        for(let deleteRequest of editRequests.deletes) {
          deletes.push(await dataLayer.createDeleteRequests(deleteRequest));
        }
      }
      response.editRequests = {adds, updates, deletes};
      reply.code(201);
      return JSON.stringify(response);
    }
  );
  return app;
}
