import {fastify} from "fastify";
import createFiltersEndpoint from "../src/endpoints/filters";
import createBusinessesEndpoint from "../src/endpoints/businesses";
import {dummyDataLayer} from "./utils/dummyDatalayer";

beforeAll(async (done) => {
  const bizApp = createBusinessesEndpoint(fastify(), dummyDataLayer);
  const response1 = await bizApp.inject({
    method: 'POST',
    url: '/businesses',
    payload: {name: "DummyBiz", region: "DummyRegion", year_added: 2019}
  });
  expect(response1.statusCode).toBe(200);
  done();
})

test('Returns the filter data added previously', async (done) => {
  const filterApp = createFiltersEndpoint(fastify(), dummyDataLayer);
  const filterResponse  = await filterApp.inject({ method: 'GET', url: '/filters' });

  expect(filterResponse.statusCode).toBe(200);
  expect(JSON.parse(filterResponse.payload).years).toContain(2019);
  await filterApp.close();
  done();
});
