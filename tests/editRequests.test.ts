import {DummyDatalayer} from "./testUtils/testDataLayer";
import { testify} from "./testUtils/testify";
import {createEditEndpoint, EditRequest, DEFAULT_PAGE_SIZE} from "../src/endpoints/editRequest";
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
import {Business, createBusinessesEndpoint} from "../src/endpoints/businesses";
import {Region} from "../src/database/productionDataLayer";
import createRegionsEndpoint from "../src/endpoints/regions";

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

  it("Can view all edit requests as a system admin but not as region manager", async(done) => {

    const postResponse1 = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(postResponse1.statusCode).toBe(201);
    let {id: id1} = JSON.parse(postResponse1.payload);

    const differentRegionAdd =  {...DummyAdd, regionId: `Not${DummyRegion.name}`};
    const postResponse2 = await submitEditRequest(differentRegionAdd, differentRegionAdd.regionId, dummyRegionManagerToken);
    expect(postResponse2.statusCode).toBe(201);

    const regionManagerResponse = await getAllEditRequests(dummyRegionManagerToken);
    expect(regionManagerResponse.statusCode).toBe(401);

    const allResponse = await getAllEditRequests(dummyAdminToken);
    expect(allResponse.statusCode).toBe(200);

    let postedRequest1 = asResponse(asInitializedEditRequest(DummyAdd, JSON.parse(postResponse1.payload).id));
    let postedRequest2 = asResponse(asInitializedEditRequest(differentRegionAdd,  JSON.parse(postResponse2.payload).id));
    expect(JSON.parse(allResponse.payload).editRequests).toStrictEqual(arrayContaining([
      postedRequest1,
      postedRequest2
    ]));

    const pendingResponse = await getAllEditRequests(dummyAdminToken, {status: "Pending"});
    expect(pendingResponse.statusCode).toBe(200);
    expect(JSON.parse(pendingResponse.payload).editRequests).toStrictEqual(arrayContaining([
      postedRequest1,
      postedRequest2
    ]));

    await updateEditRequestStatus(id1, "Reviewed", dummyAdminToken);

    const adminResponse = await getAllEditRequests(dummyAdminToken, {status: "Reviewed"}     );
    expect(adminResponse.statusCode).toBe(200);
    expect(JSON.parse(adminResponse.payload).editRequests).toStrictEqual(
      arrayContaining([
        objectContaining({...DummyAdd, id: id1, status: "Reviewed", dateSubmitted: any(String), dateUpdated: any(String)}),
      ])
    );

    await testApp.close();
    done();
  });

  it("Can retrieve all edit requests with pagination", async(done) => {

    const page2Response = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(page2Response.statusCode).toBe(201);
    let {id: id2} = JSON.parse(page2Response.payload);
    let secondPageRequest = asResponse(asInitializedEditRequest(DummyAdd, id2));

    let firstPageObjects = <EditRequest[]>[];
    for(let i = 0; i < DEFAULT_PAGE_SIZE; i++) {
      const page1Response = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
      expect(page1Response.statusCode).toBe(201);
      let {id} = JSON.parse(page1Response.payload);
      firstPageObjects.push(asResponse(asInitializedEditRequest(DummyAdd, id)));
    }

    const firstPageResponse = await getAllEditRequests(dummyAdminToken);
    expect(firstPageResponse.statusCode).toBe(200);
    let firstResponseEdits = JSON.parse(firstPageResponse.payload).editRequests;
    expect(firstResponseEdits).toStrictEqual(arrayContaining(firstPageObjects));

    let afterId = firstResponseEdits[firstResponseEdits.length-1].id;
    afterId = !!afterId? afterId : "";
    const secondPageResponse = await getAllEditRequests(dummyAdminToken, {afterId});
    expect(secondPageResponse.statusCode).toBe(200);
    expect(JSON.parse(secondPageResponse.payload).editRequests).toStrictEqual([secondPageRequest]);

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

  it("Can show a preview of the records that would be changed by an edit request", async(done) => {
    async function createRegion(regionApp: FastifyInstance, region: Region) {
      let temp = await regionApp.inject({
        method: "POST",
        url: `/regions/`,
        payload: region,
        headers: {authorization: `Bearer ${dummyAdminToken}`}
      });
      return temp;
    }

    async function createBusiness(bizApp: FastifyInstance, biz: Business) {
      let temp = await bizApp.inject({
        method: "POST",
        url: `/regions/${biz.regionId}/businesses`,
        payload: biz,
        headers: {authorization: `Bearer ${dummyAdminToken}`}
      });
      return temp;
    }

    const regionApp = createRegionsEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    const bizApp = createBusinessesEndpoint(testApp, testDataLayer, dummyTokenVerifier);
    await createRegion(regionApp, DummyRegion);
    let biz1 = {...DummyBiz, name: `UpdatingName`, employees: DummyBiz.employees + 10, industry: `OriginalIndustry}`};
    let biz2 = {...DummyBiz, name: "Deleting"};
    let {businessId: bizId1} = JSON.parse((await createBusiness(bizApp, biz1)).payload);
    let {businessId: bizId2} = JSON.parse((await createBusiness(bizApp, biz2)).payload);
    const request : EditRequest = {
      ...DummyAdd,
      updates: [{
        id: bizId1,
        name: "UpdatedName",
        industry: "UpdatedIndustry"
      }],
      deletes: [bizId2]
    };

    let submitResponse = await submitEditRequest(request, DummyRegion.name, dummyRegionManagerToken);
    expect(submitResponse.statusCode).toBe(201);
    let {id} = JSON.parse(submitResponse.payload);

    let previewResponse = await getEditPreview(id, dummyAdminToken);
    expect(previewResponse.statusCode).toBe(200);
    expect(JSON.parse(previewResponse.payload)).toStrictEqual(
      objectContaining({
        added: arrayContaining([objectContaining({...DummyBiz, id: any(String)})]),
        updated: arrayContaining([objectContaining({...biz1, id: bizId1, name: "UpdatedName", industry: "UpdatedIndustry"})]),
        deleted: arrayContaining([objectContaining({...biz2, id: bizId2})])
      })
    );

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

  async function submitEditRequest(request: EditRequest, regionId: string, token: string) {
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

  async function getEditPreview(id: string, token: string) {
    return await editEndpoint.inject({
      method: "GET",
      url: `/edits/${id}/preview`,
      headers: {authorization: `Bearer ${token}`}
    });
  }

  function getAllEditRequests(token: string, params?: {status?: string, afterId?: string}) {
    let statusParam, pageParam;
    if (!!params) {
      statusParam = !!params.status ? `status=${params.status}` : "";
      pageParam = !!params.afterId ? `afterId=${params.afterId}` : "";
    }
    let querystring = !!statusParam || !!pageParam ? `?${statusParam}&${pageParam}` : "";
    let url = `/edits/all${querystring}`;
    return editEndpoint.inject({
      method: "GET",
      url,
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
