import {byIdSchema, byRegionIdSchema} from './basicSchemas';
import { businessSchema} from './businessesSchemas';

 const editRequestSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Omit when creating new edit requests'
    },
    regionId: {type: 'string'},
    submitter: {type: 'string'},
    dateSubmitted: {type: 'string'},
    dateUpdated: {type: 'string'},
    status: {type: 'string'},
    adds: {
      type: 'array',
      items: businessSchema
    },
    updates: {
      type: 'array',
      items: businessSchema
    },
    deletes: {
      type: 'array',
      items: {type: 'string'}
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

export const getEditRequestsByRegionSchema = {
  params: byRegionIdSchema,
  querystring: {
    type: 'object',
    properties: {
      afterId: {type: 'string'}
    }
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        editRequests: {
          type: 'array',
          items: editRequestSchema
        }
      }
    }
  }
};

export const getAllEditRequestsByStatusSchema = {
  description:  'Returns all edit requests. Query string may specify the status parameter to filter for a specific status. Only usable by system admins',
  querystring: {
    type: 'object',
    properties: {
      status: {type: 'string'},
      afterId: {type: 'string'}
    }
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        editRequests: {
          type: 'array',
          items: editRequestSchema
        }
      }
    }
  }
};

export const getEditPreviewSchema = {
  params: byIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        added: {
          type: 'array',
          items: businessSchema
        },
        updated: {
          type: 'array',
          items: businessSchema
        },
        deleted: {
          type: 'array',
          items: businessSchema
        }
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

export const createEditRequestSchema = {
  description: 'Creates the supplied edit request',
  body: editRequestSchema,
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
