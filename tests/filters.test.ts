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

describe("Filter Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeAll(async (done) => {
    setupAuth0TestEnv();
    testDataLayer = new DummyDatalayer();
    const server = testify();
    const regionsApp = createRegionsEndpoint(server, testDataLayer, dummyTokenVerifier);
    const bizApp = createBusinessesEndpoint(server, testDataLayer, dummyTokenVerifier);

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
    done();
  });

  it('Returns only the region-specific filter data', async (done) => {
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

  it("Gets all industries for admin users", async (done) => {
    const server = testify();
    const filterApp = createFiltersEndpoint(server, testDataLayer, dummyTokenVerifier);
    const industriesResponse = await filterApp.inject({
      method: 'GET',
      url: `/filters/industries`,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });
    expect(industriesResponse.statusCode).toBe(200);
    expect(JSON.parse(industriesResponse.payload).industries).toStrictEqual(
      expect.arrayContaining([
          DummyBiz.industry,
          `Not ${DummyBiz.industry}`
        ])
      );
    await filterApp.close();
    done();
  });

  it("Denies all industries for non-admin users", async (done) => {
    const server = testify();
    const filterApp = createFiltersEndpoint(server, testDataLayer, dummyTokenVerifier);
    const industriesResponse = await filterApp.inject({
      method: 'GET',
      url: `/filters/industries`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(industriesResponse.statusCode).toBe(401);
    await filterApp.close();
    done();
  });
});
