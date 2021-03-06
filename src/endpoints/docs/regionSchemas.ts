import {filtersSchema} from "./filterSchemas";
import {byRegionIdSchema} from "./basicSchemas";

const managerIdSchema = {
  type: 'string',
  description: "The second half of the auth0 sub claim. For example, for a user with {sub: 'auth0|123456'}, their manager ID is '123456'"
};

const byManagerIdSchema = {
  type: 'object',
  properties: {
    managerId: managerIdSchema
  }
};

const getRegionSchema = {
  type: 'object',
  properties: {
    id: {type: "string"},
    name: {type: "string"},
    manager: managerIdSchema,
    filters: filtersSchema
  }
};

const createRegionSchema = {
  type: 'object',
  properties: {
    name: {type: "string"},
    manager: managerIdSchema
  }
};

const updateRegionSchema = {
  id: {
    type: "string",
    description: "The id of the region, if applicable.",
    nullable: true
  },
  name: {type: "string"},
  manager: managerIdSchema
}


export const getManagedRegionsReqSchema = {
  description: "Returns all regions managed by the authenticated user",
  securitySchemes: [],
  params: byManagerIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        regions: {
          type: 'array',
          items: getRegionSchema
        }
      }
    }
  }
};

export const getSingleRegionReqSchema = {
  description: "Returns a single region specified by ID",
  securitySchemes: [],
  params: byRegionIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        region: getRegionSchema
      }
    }
  }
};

export const createRegionReqSchema = {
  description: "Returns all regions managed by the authenticated user",
  securitySchemes: [],
  params: byManagerIdSchema,
  body: createRegionSchema,
  response: {
    201: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        region: {type: 'string'}
      }
    }
  }
};

export const updateRegionReqSchema = {
  description: "Updates the data for a specified region",
  params: byRegionIdSchema,
  body: updateRegionSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        region: getRegionSchema
      }
    }
  }
};

export const deleteRegionReqSchema = {
  description: "Deletes the specified region",
  params: byRegionIdSchema,
  response: {
    204: {
      description: 'Region successfully deleted',
      type: 'null'
    }
  }
};
