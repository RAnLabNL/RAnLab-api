import createRegionsEndpoint from "../src/endpoints/regions";
import {fastify} from "fastify";
import {testDataLayer} from "./utils/testDataLayer";
import {DummyRegion, requestDummyManagedRegions} from "./utils/dummyData";

beforeEach(async (done) => {
  await testDataLayer.setRegion(DummyRegion);
  done();
});


test('Can create and retrieve a region by manager ID', async (done) => {
  const app = createRegionsEndpoint(fastify(), testDataLayer);
  const response = await requestDummyManagedRegions(app);

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.payload).regions).toEqual(expect.arrayContaining([DummyRegion]));
  await app.close();
  done();
});

it('Can update and retrieve a region', async (done) => {
  const app = createRegionsEndpoint(fastify(), testDataLayer);
  const updatedRegion = {
    id: "TestRegion",
    manager: "TestManager"
  };
  const response = await app.inject( {
    method: 'POST',
    url: `/regions/${DummyRegion.id}`,
    payload: updatedRegion
  });

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.payload).region).toEqual(updatedRegion);
  await app.close();
  done();
});

it('Can delete a region', async (done) => {
  const app = createRegionsEndpoint(fastify(), testDataLayer);
  const deleteResponse = await app.inject( {
    method: 'DELETE',
    url: '/regions/DummyRegion"',
  });

  expect(deleteResponse.statusCode).toBe(204);

  const getResponse = await requestDummyManagedRegions(app);
  expect(JSON.parse(getResponse.payload).regions).toEqual([]);

  await app.close();
  done();
});
