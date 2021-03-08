import {DummyDatalayer} from "./testUtils/testDataLayer";
import { testify} from "./testUtils/testify";
import {createEditEndpoint, EditRequest, URL_PENDING_EDIT_REQUESTS, URL_REVIEWED_EDIT_REQUESTS} from "../src/endpoints/editRequest";
import {
  dummyAdminToken,
  DummyBiz,
  DummyRegion,
  dummyRegionManagerToken,
  dummyTokenVerifier
} from "./testUtils/dummyData";
import arrayContaining = jasmine.arrayContaining;
import {FastifyInstance} from "fastify";
import objectContaining = jasmine.objectContaining;
import any = jasmine.any;

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
  let testApp : FastifyInstance;
  let editEndpoint : FastifyInstance;

  beforeEach(() => {
    testDataLayer = new DummyDatalayer();
    testApp = testify();
    editEndpoint = createEditEndpoint(testApp, testDataLayer, dummyTokenVerifier);
  });

  it("Cannot submit or view edit requests as an unauthenticated user", async (done) => {
    const postResponse = await submitEditRequest(DummyAdd, DummyRegion.name, "");
    expect(postResponse.statusCode).toBe(401);

    const getResponse = await getEditRequestsByRegion(DummyRegion.name, "");
    expect(getResponse.statusCode).toBe(401);

    await testApp.close();
    done();
  });

  it("Can view a single edit request by request id as region or system admin", async(done) => {
    const postResponse = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(postResponse.statusCode).toBe(201);
    const responseData = JSON.parse(postResponse.payload);
    expect(responseData).toStrictEqual(expect.objectContaining({ id: responseData.id}));

    const regionManagerResponse = await getRequestById(responseData.id, dummyRegionManagerToken);
    expect(regionManagerResponse.statusCode).toBe(200);
    const postedEdit = asResponse(asInitializedEditRequest(DummyAdd, responseData.id));
    expect(JSON.parse(regionManagerResponse.payload).editRequest).toStrictEqual(postedEdit);

    const adminResponse = await getRequestById(responseData.id, dummyAdminToken);
    expect(adminResponse.statusCode).toBe(200);
    expect(JSON.parse(adminResponse.payload).editRequest).toStrictEqual(postedEdit);

    await testApp.close();
    done();
  });

  describe("Edit Requests by Region", () => {
    it("Can submit and view edit requests by region as a region admin", async (done) => {
      const postResponse = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
      expect(postResponse.statusCode).toBe(201);
      const responseData = JSON.parse(postResponse.payload);
      expect(responseData).toStrictEqual(expect.objectContaining({ id: responseData.id}));

      const postedEdit = asResponse(asInitializedEditRequest(DummyAdd, responseData.id));
      const getResponse = await getEditRequestsByRegion(DummyRegion.name, dummyRegionManagerToken)
      expect(getResponse.statusCode).toBe(200);
      expect(JSON.parse(getResponse.payload).editRequests).toStrictEqual(arrayContaining([postedEdit]));

      await testApp.close();
      done();
    });

    it("Can submit and view edit requests as a system admin", async (done) => {
      const postResponse = await submitEditRequest(DummyAdd, DummyRegion.name, dummyAdminToken);
      expect(postResponse.statusCode).toBe(201);
      const responseData = JSON.parse(postResponse.payload);
      expect(responseData).toStrictEqual(expect.objectContaining({ id: responseData.id}));
      const postedEdit = asResponse(asInitializedEditRequest(DummyAdd,responseData.id));

      const getResponse = await getEditRequestsByRegion(DummyRegion.name, dummyAdminToken);
      expect(getResponse.statusCode).toBe(200);
      expect(JSON.parse(getResponse.payload).editRequests).toStrictEqual(arrayContaining([postedEdit]));

      await testApp.close();
      done();
    });
  });

  it("Can view all pending edit requests as a system admin but not as region manager", async(done) => {
    function getPendingEditRequests(token: string) {
      return editEndpoint.inject({
        method: "GET",
        url: URL_PENDING_EDIT_REQUESTS,
        headers: {authorization: `Bearer ${token}`}
      });
    }

    const postResponse1 = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(postResponse1.statusCode).toBe(201);

    const differentRegionAdd =  {...DummyAdd, regionId: `Not${DummyRegion.name}`};
    const postResponse2 = await submitEditRequest(differentRegionAdd, differentRegionAdd.regionId, dummyRegionManagerToken);
    expect(postResponse2.statusCode).toBe(201);

    const regionManagerResponse = await getPendingEditRequests(dummyRegionManagerToken);
    expect(regionManagerResponse.statusCode).toBe(401);

    const byRegionResponse = await getEditRequestsByRegion(DummyRegion.name, dummyRegionManagerToken);
    expect(JSON.parse(byRegionResponse.payload).editRequests.length).toBe(1);

    const getResponse = await getPendingEditRequests(dummyAdminToken);
    expect(getResponse.statusCode).toBe(200);
    let postedRequest1 = asResponse(asInitializedEditRequest(DummyAdd, JSON.parse(postResponse1.payload).id));
    let postedRequest2 = asResponse(asInitializedEditRequest(differentRegionAdd,  JSON.parse(postResponse2.payload).id));
    expect(JSON.parse(getResponse.payload).editRequests).toStrictEqual(arrayContaining([
      postedRequest1,
      postedRequest2
    ]));

    await testApp.close();
    done();
  });

  it("Can view all reviewed edit requests as sysadmin but not region manager", async (done) => {
    function getReviewedEditRequests(token: string) {
      return editEndpoint.inject({
        method: "GET",
        url: URL_REVIEWED_EDIT_REQUESTS,
        headers: {authorization: `Bearer ${token}`}
      });
    }

    const postResponse1 = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(postResponse1.statusCode).toBe(201);
    let {id: id1} = JSON.parse(postResponse1.payload);

    const differentRegionAdd =  {...DummyAdd, regionId: `Not${DummyRegion.name}`};
    const postResponse2 = await submitEditRequest(differentRegionAdd, differentRegionAdd.regionId, dummyRegionManagerToken);
    expect(postResponse2.statusCode).toBe(201);
    let {id: id2} = JSON.parse(postResponse2.payload);

    await updateEditRequestStatus(id1, "Reviewed", dummyAdminToken);
    await updateEditRequestStatus(id2, "Reviewed", dummyAdminToken);

    const adminResponse = await getReviewedEditRequests(dummyAdminToken);
    expect(adminResponse.statusCode).toBe(200);
    expect(JSON.parse(adminResponse.payload).editRequests).toStrictEqual(
      arrayContaining([
        objectContaining({...DummyAdd, id: id1, status: "Reviewed", dateSubmitted: any(String), dateUpdated: any(String)}),
        objectContaining({...differentRegionAdd, id: id2, status: "Reviewed", dateSubmitted: any(String), dateUpdated: any(String)}),
      ])
    );

    const regionManagerResponse = await getReviewedEditRequests(dummyRegionManagerToken);
    expect(regionManagerResponse.statusCode).toBe(401);

    const unauthenticatedResponse = await getReviewedEditRequests("");
    expect(unauthenticatedResponse.statusCode).toBe(401);

    await testApp.close();
    done();
  })

  it("Can only update edit request status as sysadmin", async(done) => {
    const submitResponse = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(submitResponse.statusCode).toBe(201);
    let createdRequest = {...DummyAdd, id: JSON.parse(submitResponse.payload).id};

    const unauthorizedResponse = await updateEditRequestStatus(createdRequest.id, "Approved", "");
    expect(unauthorizedResponse.statusCode).toBe(401);

    const regionManagerResponse = await updateEditRequestStatus(createdRequest.id, "Approved", dummyRegionManagerToken);
    expect(regionManagerResponse.statusCode).toBe(401);

    const updateResponse = await updateEditRequestStatus(createdRequest.id, "Approved", dummyAdminToken);
    expect(updateResponse.statusCode).toBe(200);

    const updatedRequest = asResponse({
      ...createdRequest,
      status: "Approved"
    });
    expect(JSON.parse(updateResponse.payload).editRequest).toStrictEqual(objectContaining(updatedRequest));

    const postUpdateRead = await getRequestById(createdRequest.id, dummyRegionManagerToken);
    expect(postUpdateRead.statusCode).toBe(200);
    expect(JSON.parse(postUpdateRead.payload).editRequest).toStrictEqual(objectContaining(updatedRequest));

    await testApp.close();
    done();
  });

  async function getRequestById(requestId: string, token: string) : Promise<any> {
    return await editEndpoint.inject({
      method: "GET",
      url: `/edits/${requestId}`,
      headers: {authorization: `Bearer ${token}`}
    });
  }

  async function submitEditRequest(request: any, regionId: string, token: string) {
    let postOptions = {
      method: <"POST">"POST",
      url: `/region/${regionId}/edits`,
      payload: request,
      headers: {}
    }
    if(!!token) {
      postOptions.headers = {authorization: `Bearer ${token}`}
    }
    return await editEndpoint.inject(postOptions);
  }

  async function updateEditRequestStatus(id: string, newStatus: string, token: string) : Promise<any> {
    return testApp.inject({
      method: "POST",
      url: `/edits/${id}`,
      payload: {status: newStatus},
      headers: {
        authorization: `Bearer ${token}`
      }
    });
  }

  async function getEditRequestsByRegion(regionId: string, token: string) {
    return await editEndpoint.inject({
      method: "GET",
      url: `/region/${regionId}/edits`,
      headers: {authorization: `Bearer ${token}`}
    });
  }

  /**
   * Simulates the standard data conversion when data is submitted in a request and then received in a response
   * @param rawEdit - the edit data in its original pre-submission
   * @return - the same data, but having been stringified and then parsed again. This has implicates for, for example, Date strings
   */
  function asResponse(rawEdit: EditRequest) : EditRequest {
    return JSON.parse(JSON.stringify(rawEdit));
  }

  function asInitializedEditRequest(rawEdit: EditRequest, id: string) : EditRequest {
    return {...rawEdit, id, status: "Pending"};
  }
});
