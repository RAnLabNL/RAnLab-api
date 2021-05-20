export const emptyCacheSchema = {
  description: 'Removes the currently authorized user from the credentials cache',
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        status: {type: 'string'}
      }
    }
  }
};
