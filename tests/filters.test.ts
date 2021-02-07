import {createFiltersEndpoint} from "../src/endpoints/filters";
import {Business, createBusinessesEndpoint} from "../src/endpoints/businesses";
import {DummyDatalayer} from "./utils/testDataLayer";
import {createDummyBusiness, createDummyRegion, DummyBiz, DummyRegion} from "./utils/dummyData";
import createRegionsEndpoint from "../src/endpoints/regions";
import {getMockToken, MockAuth0Return, setupAuth0TestEnv, testify} from "./utils/testify";

describe("Filter Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeAll(async (done) => {
    setupAuth0TestEnv();
    testDataLayer = new DummyDatalayer();
    const server = testify(new MockAuth0Return());
    const regionsApp = createRegionsEndpoint(server, testDataLayer);
    const bizApp = createBusinessesEndpoint(server, testDataLayer);

    await createDummyRegion(regionsApp);
    await createDummyBusiness(bizApp);
    await createDummyBusiness(bizApp, <Business>{
      name: `Not ${DummyBiz.name}`,
      employees: 1,
      regionId: `Not ${DummyRegion.name}`,
      industry: `Not ${DummyBiz.industry}`,
      year_added: DummyBiz.year_added + 1
    });
    done();
  });

  it('Returns only the region-specific filter data', async (done) => {
    const server = testify(new MockAuth0Return());
    const filterApp = createFiltersEndpoint(server, testDataLayer);
    const filterResponse  = await filterApp.inject({
      method: 'GET',
      url: `/regions/${DummyRegion.name}/filters`,
      headers: { authorization: `Bearer ${getMockToken({userId:DummyRegion.manager, admin: false})}`}
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
});
