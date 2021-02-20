import {byRegionIdSchema} from "./basicSchemas";

export const filtersSchema = {
  type: 'object',
  description: "Only valid for GET responses",
  properties: {
    years: {
      type: 'array',
      items: {type: 'number'}
    },
    industries: {
      type: 'array',
      items: {type: 'string' }
    },
  }
}

export const getFilterSchema = {
  description: 'Endpoint for interacting directly with filters for a particular region',
  params: byRegionIdSchema,
  security: [],
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        date: { type: 'string' },
        filters: filtersSchema
      }
    }
  }
};

export const getAllIndustriesSchema = {
  description: 'Admin-only endpoint allowing access to the global list of industries',
  security: [],
  response: {
    200: {
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        industries: {
          type: "array",
          items: {
            type: "string"
          }
        }
      }
    }
  }
};
