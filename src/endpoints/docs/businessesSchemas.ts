import {filtersSchema} from "./filterSchemas";
import {byRegionIdSchema} from "./basicSchemas";

export const businessSchema = {
  type: 'object',
  properties: {
    id: {
      type: "string",
      description: "The id for the specific business. Should be omitted when creating new entries.",
      nullable: true
    },
    name: {type: 'string'},
    employees: { type: 'number'},
    regionId: {type: 'string'},
    industry: {type: 'string'},
    year_added: {type: 'number'},
    location: {
      type: 'array',
      items: { type: "number", max: 2},
      nullable: true
    }
  }
};

export const businessesSchema = {
  type: 'array',
  items: businessSchema
};

const bizByIdSchema = {
  type: 'object',
  properties: {
    businessId: {type: "string"}
  }
};

export const getBizSchema = {
  description:  "Returns all businesses located in the specified region",
  params: byRegionIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        region: {type: 'string'},
        businesses: businessesSchema,
        filters: filtersSchema
      }
    }
  }
};

export const exportBusinessesSchema = {
  description: "Exports all business records as a stream of csv text",
  responses: {
    200: {
      description: 'Successful response',
      headers: {
        schema: {
          'transfer-encoding': 'chunked'
        }
      },
      content: {
        schema: {
          'text/csv': 'string'
        }
      }
    }
  }
};

export const createBizSchema = {
  description:  "Creates a business in the specified region",
  params: byRegionIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: "string"},
        businessId: {type: "string"}
      }
    }
  }
};

export const updateBizSchema = {
  description:  "Updates the specified business",
  params: bizByIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: "string"},
        business: businessSchema
      }
    }
  }
};
