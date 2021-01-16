import {fastify} from "fastify";
import {createFiltersEndpoint} from "../src/endpoints/filters";
import {Business, createBusinessesEndpoint} from "../src/endpoints/businesses";
import {DummyDatalayer} from "./utils/testDataLayer";
import {createDummyBusiness, DummyBiz, DummyRegion} from "./utils/dummyData";

describe("Filter Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeAll(async (done) => {
    testDataLayer = new DummyDatalayer();
    const bizApp = createBusinessesEndpoint(fastify(), testDataLayer);
    await createDummyBusiness(bizApp)
    await createDummyBusiness(bizApp, <Business>{
      name: `Not ${DummyBiz.name}`,
      employees: 1,
      region: `Not ${DummyRegion.id}`,
      industry: `Not ${DummyBiz.industry}`,
      year_added: DummyBiz.year_added + 1
    });
    done();
  });

  it('Returns only the region-specific filter data', async (done) => {
    const filterApp = createFiltersEndpoint(fastify(), testDataLayer);
    const filterResponse  = await filterApp.inject({ method: 'GET', url: `/filters/${DummyRegion.id}` });

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
