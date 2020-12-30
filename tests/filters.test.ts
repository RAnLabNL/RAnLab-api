import {fastify} from "fastify";
import {createFiltersEndpoint} from "../src/endpoints/filters";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import {DummyDatalayer} from "./utils/testDataLayer";
import {createDummyBusiness, DummyBiz} from "./utils/dummyData";

describe("Filter Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeAll(async (done) => {
    testDataLayer = new DummyDatalayer();
    const bizApp = createBusinessesEndpoint(fastify(), testDataLayer);
    await createDummyBusiness(bizApp)
    done();
  });

  it('Returns the filter data added previously', async (done) => {
    const filterApp = createFiltersEndpoint(fastify(), testDataLayer);
    const filterResponse  = await filterApp.inject({ method: 'GET', url: '/filters' });

    expect(filterResponse.statusCode).toBe(200);
    expect(JSON.parse(filterResponse.payload).years).toContain(DummyBiz.year_added);
    await filterApp.close();
    done();
  });
});
