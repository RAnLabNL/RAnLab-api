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

let industryListSchema = {
  type: 'object',
  properties: {
    industries: {
      type: 'array',
      items: {
        type: 'string'
      }
    }
  }
};

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
  description: 'Endpoint returning the global list of industries',
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

export const addIndustriesSchema = {
  description: 'Adds one or more industries to the global list of industries that can be filtered on',
  body: industryListSchema,
  response: {
    201: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        id: {type: 'string'}
      }
    }
  }
};

export const deleteIndustriesSchema = {
  description: 'Deletes one or more industries from the global list of industries',
  body: industryListSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        id: {type: 'string'}
      }
    }
  }
};

