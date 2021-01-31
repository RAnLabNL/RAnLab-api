export const byRegionIdSchema = {
  type: 'object',
  properties: {
    regionId: {
      type: 'string',
      description: "The region to use for this request"
    }
  }
};
