export const byIdSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'The ID of the item to retrieve'
    }
  }
};

export const byRegionIdSchema = {
  type: 'object',
  properties: {
    regionId: {
      type: 'string',
      description: "The region to use for this request"
    }
  }
};
