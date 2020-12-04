import {FastifyInstance} from "fastify";
import {Business} from "../../src/endpoints/businesses";
import {Region} from "../../src/database/productionDataLayer";

export const DummyRegion: Region = {
  id: "DummyRegion",
  manager: "DummyManagerId"
};

export const DummyBiz: Business = {
  name: "DummyBiz",
  region: DummyRegion.id,
  year_added: 2009,
  employees: 1
};

export async function createDummyBusiness(bizApp: FastifyInstance) {
  return await bizApp.inject({
    method: 'POST',
    url: '/businesses',
    payload: DummyBiz
  });
}

export async function requestDummyManagedRegions(app: FastifyInstance) {
  return await app.inject({method: 'GET', url: `/regions/${DummyRegion.manager}`});
}
