import { strict as assert } from 'assert';
import baretest from 'baretest';
import fastify from 'fastify';
import path from 'path';
import createPingEndpoint from './ping';

const test = baretest(path.basename(__filename, '.test.js'));

test('returns a status code of 200', async () => {
  const app = createPingEndpoint(fastify());
  const response = await app.inject({ method: 'GET', url: '/ping' });

  assert.equal(response.statusCode, 200);

  await app.close();
});

(async () => { process.exitCode = (await test.run()) ? 0 : 1; })();
