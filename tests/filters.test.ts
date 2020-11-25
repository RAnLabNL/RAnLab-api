import {fastify} from "fastify";
import createFiltersEndpoint from "../src/endpoints/filters";

test('Returns the prebaked data', async (done) => {
  const app = createFiltersEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/filters' });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.payload).years).toContain(2019);
  await app.close();
  done();
});

