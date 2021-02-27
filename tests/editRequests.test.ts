import {DummyDatalayer} from "./testUtils/testDataLayer";
import { testify} from "./testUtils/testify";
import {createEditEndpoint, EditRequest} from "../src/endpoints/editRequest";
import {
  dummyAdminToken,
  DummyBiz,
  DummyRegion,
  dummyRegionManagerToken,
  dummyTokenVerifier
} from "./testUtils/dummyData";
import arrayContaining = jasmine.arrayContaining;

const DummyAdd : EditRequest = {
  regionId: DummyRegion.name,
  submitter: DummyRegion.manager,
  dateSubmitted: new Date(),
  dateUpdated: new Date(),
  status: "",
  adds: [DummyBiz]
}

describe("Edit Request unit tests", () => {

  let testDataLayer: DummyDatalayer

  it("Cannot submit or view edit requests as an unauthenticated user", async (done) => {
    testDataLayer = new DummyDatalayer();
    const testApp = testify();
    let editEndpoint = createEditEndpoint(testApp, testDataLayer, dummyTokenVerifier);

    const postResponse = await editEndpoint.inject({
      method: "POST",
      url: `/region/${DummyRegion.name}/edits`,
      payload: DummyAdd
    });
    expect(postResponse.statusCode).toBe(401);

    const getResponse = await editEndpoint.inject({
      method: "GET",
      url: `/region/${DummyRegion.name}/edits`
    })
    expect(getResponse.statusCode).toBe(401);

    await testApp.close();
    done();
  });

  it("Can submit and view edit requests by region as a region admin", async (done) => {
    testDataLayer = new DummyDatalayer();
    const testApp = testify();
    let editEndpoint = createEditEndpoint(testApp, testDataLayer, dummyTokenVerifier);

    const postResponse = await editEndpoint.inject({
      method: "POST",
      url: `/region/${DummyRegion.name}/edits`,
      payload: DummyAdd,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });

    expect(postResponse.statusCode).toBe(201);
    const responseData = JSON.parse(postResponse.payload);
    expect(responseData).toStrictEqual(expect.objectContaining({ id: responseData.id}));
    const postedEdit = {...DummyAdd, id: responseData.id};

    const getResponse = await editEndpoint.inject({
      method: "GET",
      url: `/region/${DummyRegion.name}/edits`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    })
    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.payload).editRequests).toStrictEqual(arrayContaining([JSON.parse(JSON.stringify(postedEdit))]));

    await testApp.close();
    done();
  });

  it("Can submit and view edit requests as a system admin", async (done) => {
    testDataLayer = new DummyDatalayer();
    const testApp = testify();
    let editEndpoint = createEditEndpoint(testApp, testDataLayer, dummyTokenVerifier);

    const postResponse = await editEndpoint.inject({
      method: "POST",
      url: `/region/${DummyRegion.name}/edits`,
      payload: DummyAdd,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });

    expect(postResponse.statusCode).toBe(201);
    const responseData = JSON.parse(postResponse.payload);
    expect(responseData).toStrictEqual(expect.objectContaining({ id: responseData.id}));
    const postedEdit = {...DummyAdd, id: responseData.id};

    const getResponse = await editEndpoint.inject({
      method: "GET",
      url: `/region/${DummyRegion.name}/edits`,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    })
    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.payload).editRequests).toStrictEqual(arrayContaining([JSON.parse(JSON.stringify(postedEdit))]));

    await testApp.close();
    done();
  });

  it("Can view all edit requests as a system admin but not as region manager", async(done) => {
    testDataLayer = new DummyDatalayer();
    const testApp = testify();
    let editEndpoint = createEditEndpoint(testApp, testDataLayer, dummyTokenVerifier);

    const postResponse1 = await editEndpoint.inject({
      method: "POST",
      url: `/region/${DummyRegion.name}/edits`,
      payload: DummyAdd,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(postResponse1.statusCode).toBe(201);
    let postedRequest1 = {...DummyAdd, id: JSON.parse(postResponse1.payload).id}

    const differentRegionAdd =  {...DummyAdd, regionId: `Not${DummyRegion.name}`};
    const postResponse2 = await editEndpoint.inject({
      method: "POST",
      url: `/region/${differentRegionAdd.regionId}/edits`,
      payload: differentRegionAdd,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(postResponse2.statusCode).toBe(201);
    let postedRequest2 = {...differentRegionAdd, id: JSON.parse(postResponse2.payload).id}

    const regionManagerResponse = await editEndpoint.inject({
      method: "GET",
      url: `/edits/all`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(regionManagerResponse.statusCode).toBe(401);

    const byRegionResponse = await editEndpoint.inject({
      method: "GET",
      url: `/region/${DummyRegion.name}/edits`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`}
    });
    expect(JSON.parse(byRegionResponse.payload).editRequests.length).toBe(1);

    const getResponse = await editEndpoint.inject({
      method: "GET",
      url: `/edits/all`,
      headers: {authorization: `Bearer ${dummyAdminToken}`}
    });
    expect(getResponse.statusCode).toBe(200);
    expect(JSON.parse(getResponse.payload).editRequests).toStrictEqual(arrayContaining([
      JSON.parse(JSON.stringify(postedRequest1)),
      JSON.parse(JSON.stringify(postedRequest2))
    ]));

    await testApp.close();
    done();
  });
});
