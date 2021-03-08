import {byIdSchema, byRegionIdSchema} from "./basicSchemas";
import { businessSchema} from "./businessesSchemas";

 const editRequestSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "Omit when creating new edit requests"
    },
    regionId: {type: "string"},
    submitter: {type: "string"},
    dateSubmitted: {type: "string"},
    dateUpdated: {type: "string"},
    status: {type: "string"},
    adds: {
      type: "array",
      items: businessSchema
    },
    updates: {
      type: "array",
      items: businessSchema
    },
    deletes: {
      type: "array",
      items: {type: "string"}
    }
  }
}

export const getEditRequestByIdSchema = {
  params: byIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        editRequest: editRequestSchema
      }
    }
  }
};

export const updateEditRequestSchema = {
  params: byIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        editRequest: editRequestSchema
      }
    }
  }
}


export const getEditRequestsByRegionSchema = {
  params: byRegionIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        editRequests: {
          type: "array",
          items: editRequestSchema
        }
      }
    }
  }
};

export const getAllEditRequestsSchema = {
  description:  "Returns all edit requests. Only usable by system admins",
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        editRequests: {
          type: "array",
          items: editRequestSchema
        }
      }
    }
  }
};

export const createEditRequestSchema = {
  description:  "Creates the supplied edit request",
  body: editRequestSchema,
  response: {
    201: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        id: {type: "string"}
      }
    }
  }
};
