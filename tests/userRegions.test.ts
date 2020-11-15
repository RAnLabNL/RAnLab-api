import {fastify} from "fastify";
import createUserRegionsEndpoint from "../src/endpoints/userRegions";


test('returns a status code of 200', async () => {
  const app = createUserRegionsEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/users/joe/regions' });
  console.log(response);
  expect(response.statusCode).toBe(200);
  const payload: { date: Date; regions: string[] } = JSON.parse(
    response.payload
  );
  expect(payload.regions.length).toBe(1);

  await app.close();
});
