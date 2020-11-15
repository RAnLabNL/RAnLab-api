import fastify from 'fastify';
import createPingEndpoint from '../src/endpoints/ping';

test('returns a status code of 200', async () => {
  const app = createPingEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/ping' });

  expect(response.statusCode).toBe(200);

  await app.close();
});
