import {FastifyInstance} from "fastify";
import {Business} from "../../src/endpoints/businesses";
import {Region} from "../../src/database/productionDataLayer";
import {getMockToken} from "./testify";

const dummyManager = "DummyManagerId";
export const dummyToken = getMockToken({userId: dummyManager, admin: false})
export const dummyAdminToken = getMockToken({userId: "admin", admin: true});

export const DummyRegion: Region = {
  name: "DummyRegion",
  manager: dummyManager
};

export const DummyBiz: Business = {
  name: "DummyBiz",
  regionId: DummyRegion.name,
  year_added: 2009,
  employees: 1,
  industry: "DummyIndustry"
};

export async function createDummyRegion(regionsApp: FastifyInstance) {
  return await regionsApp.inject({
    method: "POST",
    url: "/regions",
    payload: DummyRegion,
    headers: {authorization: `Bearer ${dummyToken}`}
  });
}

export async function createDummyBusiness(bizApp: FastifyInstance, biz : Business = DummyBiz, token: string = dummyToken) {
  return await bizApp.inject({
    method: 'POST',
    url: `/regions/${biz.regionId}/businesses`,
    payload: biz,
    headers: {authorization: `Bearer ${token}`}
  });
}

export async function getDummyBusinesses(bizApp: FastifyInstance, token: string = dummyToken) {
  return await bizApp.inject({
    method: 'GET',
    url: `/regions/${DummyBiz.regionId}/businesses`,
    headers: {authorization: `Bearer ${token}`}
  });
}

export async function getRegionsByDummyManager(app: FastifyInstance, token: string = dummyToken) {
  return await app.inject({
    method: 'GET',
    headers: {authorization: `Bearer ${token}`},
    url: `/regions/manager/${DummyRegion.manager}`
  });
}
