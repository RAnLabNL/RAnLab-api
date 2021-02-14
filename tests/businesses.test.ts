import {DummyDatalayer} from "./utils/testDataLayer";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import {
  createDummyBusiness,
  createDummyRegion,
  dummyAdminToken,
  DummyBiz, DummyRegion,
  getDummyBusinesses
} from "./utils/dummyData";
import {getTestJwtVerifier,  setupAuth0TestEnv, testify} from "./utils/testify";
import createRegionsEndpoint from "../src/endpoints/regions";

describe("Business Endpoint Tests", () => {
  let testDataLayer: DummyDatalayer;

  beforeAll(() => {
    setupAuth0TestEnv();
  });

  beforeEach(async (done) => {
    testDataLayer = new DummyDatalayer();
    const server = testify();
    const regionsApp = createRegionsEndpoint(server, testDataLayer, getTestJwtVerifier("admin", true));
    await createDummyRegion(regionsApp);
    done();
  });

  it('Can create and retrieve a valid business', async(done) => {
    const server = testify();
    const bizApp = createBusinessesEndpoint(server, testDataLayer, getTestJwtVerifier(DummyRegion.manager, false))
    const createResponse = await createDummyBusiness(bizApp);
    expect(createResponse.statusCode).toBe(200);

    const getResponse = await getDummyBusinesses(bizApp);
    expect(getResponse.statusCode).toBe(200);

    let {businesses, filters} = JSON.parse(getResponse.payload);
    expect(businesses).toEqual(expect.arrayContaining([expect.objectContaining({name: DummyBiz.name})]));
    expect(filters).toEqual(expect.objectContaining({years: [DummyBiz.year_added], industries: [DummyBiz.industry]}))
    await bizApp.close();
    done();
  });

  it('Can update and retrieve a business', async(done) => {
    const bizApp = createBusinessesEndpoint(testify(), testDataLayer, getTestJwtVerifier("admin", true));

    const createResponse = await createDummyBusiness(bizApp);
    const bizId = JSON.parse(createResponse.payload).businessId;
    const updatedBiz = {...DummyBiz, id: bizId, year_added: 2020, employees: 2};
    const updateResponse = await bizApp.inject({
      method: 'POST',
      url: `/businesses/${bizId}`,
      payload: updatedBiz,
      headers:{authorization: `Bearer ${dummyAdminToken}`}
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(JSON.parse(updateResponse.payload).business).toEqual(updatedBiz);

    await bizApp.close();
    done();
  });

});
