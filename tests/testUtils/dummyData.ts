import {FastifyInstance, FastifyRequest} from "fastify";
import {Business, BusinessUpdate} from "../../src/endpoints/businesses";
import {Region} from "../../src/database/productionDataLayer";
import {getMockToken} from "./testify";

const dummyManager = "DummyManagerId";
export const dummyRegionManagerToken = getMockToken({userAppId: dummyManager, admin: false})
export const dummyAdminToken = getMockToken({userAppId: "admin", admin: true});

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

export const DummyBizUpdate: BusinessUpdate = {
  id: "DummyID",
  name: "DummyBiz",
  year_added: 2009,
  employees: 1,
  industry: "DummyIndustry"
};


export async function dummyTokenVerifier (req: FastifyRequest) {
  if(!req.headers.authorization || !req.headers.authorization.split("Bearer")[1].trim()) {
    return {userAppId: "", admin: false};
  }
  if(req.headers.authorization.indexOf(dummyAdminToken) > 0) {
    return {userAppId: "admin", admin: true};
  } else if (req.headers.authorization?.indexOf(dummyRegionManagerToken) > 0) {
    return {userAppId: DummyRegion.manager, admin: false};
  } else {
    throw new Error("Unrecognized token");
  }
}

export async function createDummyRegion(regionsApp: FastifyInstance, manager: string = dummyManager) {
  let region = {...DummyRegion};
  region.manager = manager
  try {
    let response = await regionsApp.inject({
      method: "POST",
      url: "/regions",
      payload: region,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });
    return response;
  } catch (e) {
    console.log(e);
    return null;
  }
}

export async function createDummyBusiness(bizApp: FastifyInstance, biz : Business = DummyBiz, token: string = dummyRegionManagerToken) {
  return await bizApp.inject({
    method: 'POST',
    url: `/regions/${biz.regionId}/businesses`,
    payload: biz,
    headers: {authorization: `Bearer ${token}`}
  });
}

export async function getDummyBusinesses(bizApp: FastifyInstance, token: string = dummyRegionManagerToken) {
  return await bizApp.inject({
    method: 'GET',
    url: `/regions/${DummyBiz.regionId}/businesses`,
    headers: {authorization: `Bearer ${token}`}
  });
}

export async function getRegionsByDummyManager(app: FastifyInstance, token: string = dummyRegionManagerToken) {
  return await app.inject({
    method: 'GET',
    headers: {authorization: `Bearer ${token}`},
    url: `/regions/manager/${DummyRegion.manager}`
  });
}
