import createRegionBusinessesEndpoint from "../src/endpoints/regionBusinesses";
import {fastify} from "fastify";
import createBusinessesEndpoint from "../src/endpoints/businesses";

test('creates and retrieves a valid business', async(done) => {
  const app1 = createBusinessesEndpoint(fastify());
  const app2 = createRegionBusinessesEndpoint(fastify());
  const response1 = await app1.inject({
    method: 'POST',
    url: '/businesses',
    payload: {name: "DummyBiz", region: "DummyRegion", year_added: 2009}
  });
  expect(response1.statusCode).toBe(200);

  const response2 = await app2.inject({
    method: 'GET',
    url: '/regions/DummyRegion/businesses'
  });

  expect(response2.statusCode).toBe(200);
  expect(JSON.parse(response2.payload).businesses).toEqual(expect.arrayContaining(expect.objectContaining({name: "DummyBiz"})));

  await app1.close();
  await app2.close();
  done();
})
