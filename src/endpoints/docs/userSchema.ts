export const userInfoSchema = {
  type: 'object',
  properties: {
    sub: {type: 'string'},
  }
};

export const byUserIdSchema = {
  type: 'object',
  properties: {
    id: {
      description: "userAppId - this is the second half of the user's auth0 'sub' claim (ie for auth0|123456, the userAppId is 123456)",
      type: 'string'
    }
  }
}

export const getUserInfoRequestSchema = {
  description: 'Returns a single user specified by userAppId',
  securitySchemes: [],
  params: byUserIdSchema,
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        userInfo: userInfoSchema
      }
    }
  }
};

export const getAllUsersRequestSchema = {
  description: 'Returns all users, with optional pagination',
  securitySchemes: [],
  querystring: {
    type: 'object',
    properties: {
      per_page: {
        type: 'number',
        description: 'Number of users per page'
      },
      page: {
        type: 'number',
        description: 'Page number to retrieve'
      }
    }
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        userInfo: {
          type: 'array',
          items: userInfoSchema
        }
      }
    }
  }
};

export const updateUserRequestSchema = {
  description: 'Updates the specified user',
  params: byUserIdSchema,
  securitySchemes: [],
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'},
        date: {type: 'string'},
        userInfo: userInfoSchema
      }
    }
  }
};
