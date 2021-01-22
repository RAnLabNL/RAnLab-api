import createRegionsEndpoint from "../src/endpoints/regions";
import {testify, getMockToken, MockAuth0Return} from "./utils/testify";
import {DummyDatalayer} from "./utils/testDataLayer";
import {dummyAdminToken, DummyRegion, dummyToken, getDummyRegions} from "./utils/dummyData";
import {Region} from "../src/database/productionDataLayer";
import {FastifyInstance} from "fastify";


describe("Region Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;
  let mockAuth0Return: MockAuth0Return;
  let testApp: FastifyInstance;

  beforeEach(async (done) => {
    testDataLayer= new DummyDatalayer()
    mockAuth0Return = new MockAuth0Return();
    testApp = testify(mockAuth0Return);
    await testDataLayer.setRegion(DummyRegion);
    done();
  });

  it('Can create and retrieve all regions as SysAdmin', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer);
    let testRegions: Region[] = [{name: "region1", manager: "manager1"}, {name: "region2", manager: "manager2"}];
    testRegions.forEach((r) => testDataLayer.setRegion(r));
    mockAuth0Return.userId = "DummyUser";
    const response = await getDummyRegions(app, getMockToken({userId: 'admin', admin: true}));

    expect(mockAuth0Return.callCount).toBe(1);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).regions).toEqual(expect.arrayContaining([...testRegions, DummyRegion]));
    await app.close();
    done();
  });

  it('Can create and retrieve a region as Region Manager', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer);
    mockAuth0Return.userId = "DummyUser";
    const response = await getDummyRegions(app);

    expect(mockAuth0Return.callCount).toBe(1);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).regions).toEqual(expect.arrayContaining([DummyRegion]));
    await app.close();
    done();
  });

  it('Can update and retrieve a region', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer);
    const updatedRegion = {
      name: "TestRegion",
      manager: "TestManager"
    };
    const response = await app.inject( {
      method: 'POST',
      url: `/regions/${DummyRegion.name}`,
      payload: updatedRegion
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).region).toStrictEqual(updatedRegion);
    await app.close();
    done();
  });

  it('Can delete a region', async (done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer);
    const deleteResponse = await app.inject( {
      method: 'DELETE',
      url: `/regions/${DummyRegion.name}`,
      headers: {authorization: `Bearer ${dummyToken}`}
    });

    expect(deleteResponse.statusCode).toBe(204);

    const getResponse = await getDummyRegions(app);
    expect(JSON.parse(getResponse.payload).regions).toEqual([]);

    await app.close();
    done();
  });

  it("Can retrieve a single region as either region admin or system admin", async(done) => {
    const app = createRegionsEndpoint(testApp, testDataLayer);
    const getRegionAdminResponse = await app.inject({
      method: 'GET',
      url: `/regions/${DummyRegion.name}`,
      headers: {authorization: `Bearer ${dummyToken}`}
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
