import {FastifyInstance} from "fastify";
import {Business} from "../../src/endpoints/businesses";
import {Region} from "../../src/database/productionDataLayer";
import {getMockToken} from "./testify";

const dummyManager = "DummyManagerId";
export const dummyToken = getMockToken({userId: dummyManager})
export const dummyAdminToken = getMockToken({userId: "", admin: true});

export const DummyRegion: Region = {
  id: "DummyRegion",
  manager: dummyManager
};

export const DummyBiz: Business = {
  name: "DummyBiz",
  region: DummyRegion.id,
  year_added: 2009,
  employees: 1,
  industry: "DummyIndustry"
};

export async function createDummyBusiness(bizApp: FastifyInstance, biz: Business = DummyBiz) {
  return await bizApp.inject({
    method: 'POST',
    url: '/businesses',
    payload: biz
  });
}

export async function getDummyRegions(app: FastifyInstance, token: string = dummyToken) {
  return await app.inject({method: 'GET', headers: {authorization: `Bearer ${token}`}, url: `/regions`});
}
