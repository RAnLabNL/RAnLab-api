import createRegionsEndpoint from "../src/endpoints/regions";
import {fastify} from "fastify";
import {testDataLayer} from "./utils/testDataLayer";

beforeEach(async (done) => {
  await testDataLayer.setRegion({
    id: "DummyRegion", manager: "dummyManagerId"
  });
  done();
});

test('Successfully retrieves the region by manager ID', async (done) => {
  const app = createRegionsEndpoint(fastify(), testDataLayer);
  const response = await app.inject({ method: 'GET', url: '/regions/dummyManagerId' });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.payload).regions).toEqual(expect.arrayContaining([{id:"DummyRegion", manager: "dummyManagerId"}]));
  await app.close();
  done();
});
