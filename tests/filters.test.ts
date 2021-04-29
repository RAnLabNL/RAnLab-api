import {createFiltersEndpoint} from "../src/endpoints/filters";
import {Business, createBusinessesEndpoint} from "../src/endpoints/businesses";
import {DummyDatalayer} from "./testUtils/testDataLayer";
import {
  createDummyBusiness,
  createDummyRegion, dummyAdminToken,
  DummyBiz,
  DummyRegion,
  dummyRegionManagerToken,
  dummyTokenVerifier
} from "./testUtils/dummyData";
import createRegionsEndpoint from "../src/endpoints/regions";
import {setupAuth0TestEnv, testify} from "./testUtils/testify";
import {FastifyInstance} from "fastify";

describe("Filter Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;
  const CREATED_INDUSTRY = 'Created Industry';
  let DEFAULT_INDUSTRIES = [DummyBiz.industry, `Not ${DummyBiz.industry}`, CREATED_INDUSTRY];

  beforeAll(async (done) => {
    setupAuth0TestEnv();
    testDataLayer = new DummyDatalayer();
    const server = testify();
    const regionsApp = createRegionsEndpoint(server, testDataLayer, dummyTokenVerifier);
    const bizApp = createBusinessesEndpoint(server, testDataLayer, dummyTokenVerifier);
    const filterApp = createFiltersEndpoint(server, testDataLayer,  dummyTokenVerifier);

    await createDummyRegion(regionsApp);
    let notDummyRegion = {...DummyRegion};
    notDummyRegion.name = `Not ${DummyRegion.name}`;
    await regionsApp.inject({
      method: "POST",
      url: "/regions",
      payload: notDummyRegion,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });

    await createDummyBusiness(bizApp);
    await createDummyBusiness(bizApp, <Business>{
      name: `Not ${DummyBiz.name}`,
      employees: 1,
      regionId: notDummyRegion.name,
      industry: `Not ${DummyBiz.industry}`,
      year_added: DummyBiz.year_added + 1
    });
    await createGlobalIndustry(filterApp, CREATED_INDUSTRY);
    done();
  });

  it('Region-specific filter data is correct', async (done) => {
    const server = testify();
    const filterApp = createFiltersEndpoint(server, testDataLayer,  dummyTokenVerifier);
    const filterResponse  = await filterApp.inject({
      method: 'GET',
      url: `/regions/${DummyRegion.name}/filters`,
      headers: { authorization: `Bearer ${dummyRegionManagerToken}`}
    });

    expect(filterResponse.statusCode).toBe(200);
    expect(JSON.parse(filterResponse.payload).filters).toStrictEqual(
      expect.objectContaining({
        years: [DummyBiz.year_added],
        industries: [DummyBiz.industry]
      })
    );

    await filterApp.close();
    done();
  });

  it("Global list contains all industries for admin and non-admin users", async (done) => {
    const server = testify();
    const filterApp = createFiltersEndpoint(server, testDataLayer, dummyTokenVerifier);
    const adminResponse = await filterApp.inject({
      method: 'GET',
      url: `/filters/industries`,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });
    expect(adminResponse.statusCode).toBe(200);
    expect(JSON.parse(adminResponse.payload).industries).toStrictEqual(DEFAULT_INDUSTRIES);

    const nonAdminResponse = await filterApp.inject({
      method: 'GET',
      url: `/filters/industries`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(nonAdminResponse.statusCode).toBe(200);
    expect(JSON.parse(nonAdminResponse.payload).industries).toStrictEqual(
      expect.arrayContaining([
        DummyBiz.industry,
        `Not ${DummyBiz.industry}`
      ])
    );
    await filterApp.close();
    done();
  });

  it("Can add and remove industries from the global list", async (done) => {
    const server = testify();
    const filterApp = createFiltersEndpoint(server, testDataLayer, dummyTokenVerifier);
    const SECOND_INDUSTRY = "SECOND";
    let createResponse = await createGlobalIndustry(filterApp, SECOND_INDUSTRY);

    expect(createResponse.statusCode).toBe(200);
    const getAfterCreate = await filterApp.inject({
      method: 'GET',
      url: `/filters/industries`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(getAfterCreate.statusCode).toBe(200);
    expect(JSON.parse(getAfterCreate.payload).industries).toStrictEqual(expect.arrayContaining([CREATED_INDUSTRY, SECOND_INDUSTRY ]));

    const deleteResponse = await filterApp.inject({
      method: 'DELETE',
      url: `/filters/industries`,
      payload: {industries: [CREATED_INDUSTRY]},
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });

    expect(deleteResponse.statusCode).toBe(200);
    const getAfterDelete = await filterApp.inject({
      method: 'GET',
      url: `/filters/industries`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(getAfterDelete.statusCode).toBe(200);
    expect(JSON.parse(getAfterDelete.payload).industries).toStrictEqual(
      expect.not.arrayContaining([
        CREATED_INDUSTRY
      ])
    );

    await filterApp.close();
    done();
  });

  async function createGlobalIndustry(filterApp: FastifyInstance, globalIndustry: string) {
    return await filterApp.inject({
      method: 'POST',
      url: `/filters/industries`,
      payload: {industries: [globalIndustry]},
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });
  }
});
