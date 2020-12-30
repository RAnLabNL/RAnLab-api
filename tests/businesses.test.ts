import {fastify} from "fastify";
import {DummyDatalayer} from "./utils/testDataLayer";
import {createBusinessesEndpoint, createRegionBusinessesEndpoint} from "../src/endpoints/businesses";
import {createDummyBusiness, DummyBiz, DummyRegion} from "./utils/dummyData";
import {MockAuth0Return, testify} from "./utils/testify";

describe("Business Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeEach(() => {
    testDataLayer = new DummyDatalayer();
  });
  it('Can create and retrieve a valid business', async(done) => {
    const server = testify(new MockAuth0Return());
    const bizApp = createBusinessesEndpoint(server, testDataLayer)
    const regionBizApp = createRegionBusinessesEndpoint(server, testDataLayer);
    const createResponse = await createDummyBusiness(bizApp);
    expect(createResponse.statusCode).toBe(200);

    const getResponse = await regionBizApp.inject({
      method: 'GET',
      url: `/regions/${DummyRegion.id}/businesses`
    });

    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.payload).businesses).toEqual(expect.arrayContaining([expect.objectContaining({name: DummyBiz.name})]));

    await bizApp.close();
    done();
  });

  it('Can paginate businesses', async(done) => {
    const server = testify(new MockAuth0Return());
    const bizApp = createBusinessesEndpoint(server, testDataLayer);
    const regionBizApp = createRegionBusinessesEndpoint(server, testDataLayer);
    for(let i = 0; i < 20; i++) {
      await createDummyBusiness(bizApp);
    }
    const pagedResponse = await regionBizApp.inject({
      method: "GET",
      url: `/regions/${DummyRegion.id}/businesses`
    });
    expect(pagedResponse.statusCode).toBe(200);
    const pagedPayload = JSON.parse(pagedResponse.payload);
    expect(pagedPayload).toStrictEqual(expect.objectContaining({
      businesses: expect.arrayContaining([expect.anything()]),
      pageStart: expect.stringMatching("[a-z0-9]*"),
      pageEnd: expect.stringMatching("[a-z0-9]*")
    }));
    expect(pagedPayload.businesses).toHaveLength(10);
    done();
  });

  it('Can update and retrieve a business', async(done) => {
    const bizApp = createBusinessesEndpoint(fastify(), testDataLayer);
    const bizId = JSON.parse((await createDummyBusiness(bizApp)).payload).businessId;
    const updatedBiz = {...DummyBiz, id: bizId, year_added: 2020, employees: 2};
    const updateResponse = await bizApp.inject({
      method: 'POST',
      url: `/businesses/${bizId}`,
      payload: updatedBiz
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(JSON.parse(updateResponse.payload).business).toEqual(updatedBiz);

    await bizApp.close();
    done();
  });

});
