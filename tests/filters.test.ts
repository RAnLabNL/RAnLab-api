import {fastify} from "fastify";
import {createFiltersEndpoint} from "../src/endpoints/filters";
import {Business, createBusinessesEndpoint} from "../src/endpoints/businesses";
import {DummyDatalayer} from "./utils/testDataLayer";
import {createDummyBusiness, createDummyRegion, DummyBiz, DummyRegion} from "./utils/dummyData";
import createRegionsEndpoint from "../src/endpoints/regions";
import {MockAuth0Return, testify} from "./utils/testify";

describe("Filter Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeAll(async (done) => {
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
    const filterApp = createFiltersEndpoint(fastify(), testDataLayer);
    const filterResponse  = await filterApp.inject({ method: 'GET', url: `/regions/${DummyRegion.name}/filters` });

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
