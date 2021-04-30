import {DummyDatalayer} from "./testUtils/testDataLayer";
import { testify} from "./testUtils/testify";
import {createEditEndpoint, EditRequest, DEFAULT_PAGE_SIZE, previewAddId} from "../src/endpoints/editRequest";
import {
  dummyAdminId,
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
        objectContaining({
          ...DummyAdd,
          id: id1,
          status: "Reviewed",
          reviewer: dummyAdminId,
          dateSubmitted: any(String),
          dateUpdated: any(String)})
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
    let firstResponsePayload = JSON.parse(firstPageResponse.payload);
    expect(firstResponsePayload.totalCount).toBe(DEFAULT_PAGE_SIZE + 1);
    expect(firstResponsePayload.editRequests).toStrictEqual(arrayContaining(firstPageObjects));

    let afterId = firstResponsePayload.editRequests[firstResponsePayload.editRequests.length-1].id;
    afterId = !!afterId? afterId : "";
    const secondPageResponse = await getAllEditRequests(dummyAdminToken, {afterId});
    expect(secondPageResponse.statusCode).toBe(200);
    let secondPagePayload = JSON.parse(secondPageResponse.payload);
    expect(secondPagePayload.totalCount).toBe(DEFAULT_PAGE_SIZE + 1);
    expect(secondPagePayload.editRequests).toStrictEqual([secondPageRequest]);

    await testApp.close();
    done();
  })


  it("Can only update edit request status as sysadmin", async(done) => {
    const submitResponse = await submitEditRequest(DummyAdd, DummyRegion.name, dummyRegionManagerToken);
    expect(submitResponse.statusCode).toBe(201);
    let createdRequest = {...DummyAdd, id: JSON.parse(submitResponse.payload).id};

    const unauthorizedResponse = await updateEditRequestStatus(createdRequest.id, "Reviewed", "");
    expect(unauthorizedResponse.statusCode).toBe(401);

    const regionManagerResponse = await updateEditRequestStatus(createdRequest.id, "Reviewed", dummyRegionManagerToken);
    expect(regionManagerResponse.statusCode).toBe(401);

    const updateResponse = await updateEditRequestStatus(createdRequest.id, "Reviewed", dummyAdminToken);
    expect(updateResponse.statusCode).toBe(200);

    const updatedRequest = asResponse({
      ...createdRequest,
      status: "Reviewed",
      reviewer: dummyAdminId
    });
    expect(JSON.parse(updateResponse.payload).editRequest).toStrictEqual(objectContaining(updatedRequest));

    const postUpdateRead = await getRequestById(createdRequest.id, dummyRegionManagerToken);
    expect(postUpdateRead.statusCode).toBe(200);
    expect(JSON.parse(postUpdateRead.payload).editRequest).toStrictEqual(objectContaining(updatedRequest));

    await testApp.close();
    done();
  });

  it("Implements Approval preview and workflow", async(done) => {
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
    let updatedBiz = {...DummyBiz, name: `UpdatingName`, employees: DummyBiz.employees + 10, industry: `OriginalIndustry}`};
    let deletedBiz = {...DummyBiz, name: "Deleting"};
    let {businessId: updatedBizId} = JSON.parse((await createBusiness(bizApp, updatedBiz)).payload);
    let {businessId: deletedBizId} = JSON.parse((await createBusiness(bizApp, deletedBiz)).payload);
    updatedBiz.id = updatedBizId;
    deletedBiz.id = deletedBizId;
    const request : EditRequest = {
      ...DummyAdd,
      updates: [{
        id: updatedBizId,
        name: "UpdatedName",
        industry: "UpdatedIndustry"
      }],
      deletes: [{
        id: deletedBizId,
        ...deletedBiz
      }]
    };

    let submitResponse = await submitEditRequest(request, DummyRegion.name, dummyRegionManagerToken);
    expect(submitResponse.statusCode).toBe(201);
    let {id: editRequestId} = JSON.parse(submitResponse.payload);

    let previewResponse = await getEditPreview(editRequestId, dummyAdminToken);
    expect(previewResponse.statusCode).toBe(200);
    expect(JSON.parse(previewResponse.payload)).toStrictEqual(
      objectContaining({
        added: arrayContaining([objectContaining({...DummyBiz, id: previewAddId})]),
        updated: arrayContaining([objectContaining({...updatedBiz, name: "UpdatedName", industry: "UpdatedIndustry"})]),
        deleted: arrayContaining([objectContaining({...deletedBiz})])
      })
    );

    let postPreviewResponse = await getBusinessesByRegion(bizApp, DummyBiz.regionId);
    expect(JSON.parse(postPreviewResponse.payload).businesses).toStrictEqual(arrayContaining([
      updatedBiz,
      deletedBiz
    ]));

    let approvalResponse = await updateEditRequestStatus(editRequestId, "Approved", dummyAdminToken);
    let approvalPayload = JSON.parse(approvalResponse.payload);
    expect(approvalPayload).toStrictEqual(
      objectContaining({
        added: any(Object),
        updated: any(Object),
        deleted: any(Object),
        editRequest: objectContaining({
          status: "Approved",
          submitter: DummyRegion.manager,
          reviewer: dummyAdminId,
          dateSubmitted: any(String),
          dateUpdated: any(String)
        })
      })
    );
    expect(approvalPayload.added).toStrictEqual(arrayContaining([objectContaining({...DummyBiz, id: any(String)})]));
    expect(approvalPayload.updated).toStrictEqual(arrayContaining([objectContaining({...updatedBiz, name: "UpdatedName", industry: "UpdatedIndustry"})]));
    expect(approvalPayload.deleted).toStrictEqual(arrayContaining([objectContaining({...deletedBiz})]));

    let postApprovalResponse = await getBusinessesByRegion(regionApp, DummyBiz.regionId);
    let businesses = JSON.parse(postApprovalResponse.payload).businesses;
    expect(businesses).toStrictEqual(arrayContaining([
      {...updatedBiz, name: "UpdatedName", industry: "UpdatedIndustry"},
      {...DummyBiz, id: any(String)}
    ]));
    expect(businesses.find((b:Business) => b.name === DummyBiz.name).id).not.toBe(previewAddId);

    await testApp.close();
    done();
  });

  async function getBusinessesByRegion(bizEndpoint: FastifyInstance, regionId: string) {
    return await bizEndpoint.inject({
      method: "GET",
      url: `/regions/${regionId}/businesses`,
      headers: { Authorization: `Bearer ${dummyRegionManagerToken}` }
    });
  }

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
    };
    if(!!token) {
      postOptions.headers = {authorization: `Bearer ${token}`};
    }
    return await editEndpoint.inject(postOptions);
  }

  async function updateEditRequestStatus(id: string, newStatus: string, token: string) : Promise<any> {
    let temp = await testApp.inject({
      method: "POST",
      url: `/edits/${id}`,
      payload: {status: newStatus},
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    return temp;
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
