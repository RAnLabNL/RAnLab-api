import createRegionBusinessesEndpoint from "../src/endpoints/regionBusinesses";
import {fastify} from "fastify";

test('Returns the prebaked data', async (done) => {
  const app = createRegionBusinessesEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/regions/Bay%20Bulls/businesses' });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.payload).businesses.length).toBe(1);
  await app.close();
  done();
});

