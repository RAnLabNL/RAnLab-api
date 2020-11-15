import createRegionBusinessesEndpoint from "../src/endpoints/regionBusinesses";
import {fastify} from "fastify";

test('returns a status code of 200', async (done) => {
  const app = createRegionBusinessesEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/regions/Bay%20Bulls/businesses' });

  expect(response.statusCode).toBe(200);

  await app.close();
  done();
});
