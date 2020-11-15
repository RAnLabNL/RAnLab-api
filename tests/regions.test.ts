import createRegionsEndpoint from "../src/endpoints/regions";
import {fastify} from "fastify";

test('returns a status code of 200', async () => {
  const app = createRegionsEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/regions' });

  expect(response.statusCode).toBe(200);

  await app.close();
});
