import createRegionsEndpoint from "../src/endpoints/regions";
import {
  testify,
  setupAuth0TestEnv
} from "./utils/testify";
import {DummyDatalayer} from "./utils/testDataLayer";
import {
  dummyAdminToken,
  DummyRegion,
  dummyRegionManagerToken,
  getRegionsByDummyManager,
  dummyTokenVerifier
} from "./utils/dummyData";
import {Region} from "../src/database/productionDataLayer";
import {FastifyInstance} from "fastify";

describe("Region Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;
  let testApp: FastifyInstance;

  beforeAll(() => {
    setupAuth0TestEnv();
  });

  beforeEach(async (done) => {
    testDataLayer= new DummyDatalayer()
    testApp = testify();
    await testDataLayer.setRegion(DummyRegion);
    done();
  });

  it('Can create and retrieve all regions as SysAdmin', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    let testRegions: Region[] = [{name: "region1", manager: "manager1"}, {name: "region2", manager: "manager2"}];
    testRegions.forEach((r) => testDataLayer.setRegion(r));
    for(let region of testRegions) {
      const response = await app.inject({
        method: 'GET',
        headers: {authorization: `Bearer ${dummyAdminToken}`},
        url: `/regions/manager/${region.manager}`
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).regions).toEqual(expect.arrayContaining([...testRegions.filter(r => r.manager == region.manager)]));
    }
    await app.close();
    done();
  });

  it('Can create and retrieve a region as Region Manager', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    const response = await getRegionsByDummyManager(app);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).regions).toEqual(expect.arrayContaining([DummyRegion]));
    await app.close();
    done();
  });

  it('Can update and retrieve a region', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    const updatedRegion = {
      name: "TestRegion",
      manager: DummyRegion.manager
    };
    const response = await app.inject( {
      method: 'POST',
      url: `/regions/${DummyRegion.name}`,
      payload: updatedRegion,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`},
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).region).toStrictEqual(updatedRegion);
    await app.close();
    done();
  });

  it('Can update region manager only as admin', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    const updatedRegion = {
      name: "TestRegion",
      manager: `Not ${DummyRegion.manager}`
    };
    const nonAdminResponse = await app.inject( {
      method: 'POST',
      url: `/regions/${DummyRegion.name}`,
      payload: updatedRegion,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`},
    });
    expect(nonAdminResponse.statusCode).toBe(401);

    const adminResponse = await app.inject( {
      method: 'POST',
      url: `/regions/${DummyRegion.name}`,
      payload: updatedRegion,
      headers: {authorization: `Bearer ${dummyAdminToken}`},
    });
    expect(adminResponse.statusCode).toBe(200);
    expect(JSON.parse(adminResponse.payload).region).toStrictEqual(updatedRegion);

    await app.close();
    done();
  });


  it('Can delete a region', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    const deleteResponse = await app.inject( {
      method: 'DELETE',
      url: `/regions/${DummyRegion.name}`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });

    expect(deleteResponse.statusCode).toBe(204);

    const getResponse = await getRegionsByDummyManager(app);
    expect(JSON.parse(getResponse.payload).regions).toEqual([]);

    await app.close();
    done();
  });

  it("Can retrieve a single region as either region admin or system admin", async(done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    const getRegionAdminResponse = await app.inject({
      method: 'GET',
      url: `/regions/${DummyRegion.name}`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });

    expect(getRegionAdminResponse.statusCode).toBe(200);
    expect(JSON.parse(getRegionAdminResponse.payload).region).toStrictEqual(DummyRegion);

    const getSysAdminResponse = await app.inject({
      method: 'GET',
      url: `/regions/${DummyRegion.name}`,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });

    expect(getSysAdminResponse.statusCode).toBe(200);
    expect(JSON.parse(getSysAdminResponse.payload).region).toStrictEqual(DummyRegion);

    await app.close();
    done();
  });
})
