import {fastify} from "fastify";
import {dummyDataLayer} from "./utils/dummyDatalayer";
import createBusinessesEndpoint, {Business} from "../src/endpoints/businesses";

test('creates and retrieves a valid business', async(done) => {
  const bizApp = createBusinessesEndpoint(fastify(), dummyDataLayer);
  const response1 = await bizApp.inject({
    method: 'POST',
    url: '/businesses',
    payload: {name: "DummyBiz", region: "DummyRegion", year_added: 2009}
  });
  expect(response1.statusCode).toBe(200);

  const response2 = await bizApp.inject({
    method: 'GET',
    url: '/regions/DummyRegion/businesses'
  });

  expect(response2.statusCode).toBe(200);
  let businesses: Business[] = JSON.parse(response2.payload).businesses;
  expect(businesses).toEqual(expect.arrayContaining([expect.objectContaining({name: "DummyBiz"})]));

  await bizApp.close();
  done();
})
