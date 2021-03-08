import {productionDataLayer, Region} from "../src/database/productionDataLayer";
import {firestore} from "../src/database/firestore";
import {Business} from "../src/endpoints/businesses";
import objectContaining = jasmine.objectContaining;
import {EditRequest} from "../src/endpoints/editRequest";
import arrayContaining = jasmine.arrayContaining;
import {DummyBiz} from "./testUtils/dummyData";

describe("Production Data Layer Integration Tests", () => {
  const DUMMY_REGION_1 = "DummyRegion";
  const DUMMY_REGION_2 = "DummyRegion2";
  let regionId : string;

  async function deleteRegionsNamed(regionName: string) {
    (await firestore.collection("regions").where("name", "==", regionName).get()).docs
      .forEach((doc) => doc.ref.delete());
  }

  beforeEach(async(done) => {
    (await firestore.collection("businesses").where("name", "==", "DummyBiz").get()).docs.forEach((d) => d.ref.delete());
    await firestore.collection("years").doc("2019").delete();
    (await firestore.collection("editRequests").get()).docs.forEach(req => req.ref.delete());
    await deleteRegionsNamed(DUMMY_REGION_1);
    await deleteRegionsNamed(DUMMY_REGION_2);

    done();
  });

  it("Creates, retrieves, updates, and deletes businesses while maintaining correct region filter data", async (done) => {
    let biz : Business = {
      employees: 1,
      name: "DummyBiz",
      regionId: "",
      industry: "DummyIndustry",
      year_added: 2019
    };
    biz.regionId = (await productionDataLayer.setRegion({name: DUMMY_REGION_1, manager: "Dummy"})).id;

    let id = (await productionDataLayer.setBusiness(biz)).id;
    expect(id).toBeTruthy();

    let bizData = await productionDataLayer.getBusinessesByRegion(biz.regionId);
    expect(bizData).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));

    let filters = await productionDataLayer.getFilters(biz.regionId);
    expect(filters).toEqual(expect.objectContaining({years: [{year: biz.year_added, count: 1}], industries: [{industry: biz.industry, count: 1}]}))

    biz.id = id;
    biz.employees = 2;
    biz.year_added = 2020;
    let updatedId = (await productionDataLayer.setBusiness(biz)).id;
    expect(updatedId).toEqual(id);

    let updatedBizData = await productionDataLayer.getBusinessesByRegion(biz.regionId);
    expect(updatedBizData).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));

    let updatedFilters = await productionDataLayer.getFilters(biz.regionId);
    expect(updatedFilters).toEqual(expect.objectContaining({years: [{year: biz.year_added, count: 1}], industries: [{industry: biz.industry, count: 1}]}));

    await productionDataLayer.deleteBusiness(biz.id);
    let emptyBizData = await productionDataLayer.getBusinessesByRegion(biz.regionId);
    expect(emptyBizData).toEqual([]);

    let emptyFilters = await productionDataLayer.getFilters(biz.regionId);
    expect(emptyFilters.years).toEqual([]);

    done();
  });

  it("Creates, retrieves, updates, and deletes regions", async (done) => {
    let region: Region = {
      name: DUMMY_REGION_1,
      manager: "Dummy Manager"
    };

    let {id} = await productionDataLayer.setRegion(region);
    expect(id).toBeTruthy();
    expect(id).not.toBe(region.name);

    region.id = id;
    let out = await productionDataLayer.getRegionsManagedBy("Dummy Manager");
    expect(out).toEqual(expect.arrayContaining([objectContaining({...region})]));

    region.manager = "New Manager";
    let{id: updatedId} = (await productionDataLayer.setRegion(region));
    expect(updatedId).toEqual(region.id);

    let oldManagerRegions = await productionDataLayer.getRegionsManagedBy("Dummy Manager");
    expect(oldManagerRegions).toEqual(expect.arrayContaining([]));

    let newManagerRegions = await productionDataLayer.getRegionsManagedBy(region.manager);
    expect(newManagerRegions).toEqual(expect.arrayContaining([region]));

    let region2: Region = {
      name: DUMMY_REGION_2,
      manager: "Manager2"
    };
    region2.id = (await productionDataLayer.setRegion(region2)).id;
    expect(region2.id).not.toBe(region.id);

    let adminRegions = await productionDataLayer.getAllRegions();
    expect(adminRegions).toEqual(expect.arrayContaining([region, region2]));

    await productionDataLayer.deleteRegion(region.id);
    let empty = await productionDataLayer.getRegionsManagedBy(region.manager);
    expect(empty).toEqual([]);

    done();
  });

  it("Creates, retrieves, and updates edit requests", async(done) => {
    let region: Region = {
      name: DUMMY_REGION_1,
      manager: "Dummy Manager"
    };
    regionId = (await productionDataLayer.setRegion(region)).id;

    let testRequest : EditRequest = {
      regionId: regionId,
      submitter: "",
      dateSubmitted: new Date(),
      dateUpdated: new Date(),
      status: "Pending",
      adds:[DummyBiz],
      updates: [DummyBiz],
      deletes: [],
    };

    let spoilerRequest : EditRequest = {
      regionId: `Not${regionId}`,
      submitter: "",
      dateSubmitted: new Date(),
      dateUpdated: new Date(),
      status: "Pending",
      adds:[DummyBiz],
      updates: [DummyBiz],
      deletes: [],
    };

    let {id} = await productionDataLayer.createEditRequest(testRequest);
    expect(id).toBeTruthy();
    testRequest.id = id;

    let {id:spoilerId} = await productionDataLayer.createEditRequest(spoilerRequest);
    expect(spoilerId).toBeTruthy();
    spoilerRequest.id = spoilerId;

    let editRequests = await productionDataLayer.getEditRequestsForRegion(regionId);
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(1);
    expect(editRequests).toStrictEqual(arrayContaining([testRequest]));

    let singleRequest = await productionDataLayer.getEditRequestById(id);
    expect(singleRequest).toBeTruthy();
    if(!!singleRequest) {
      expect(singleRequest).toStrictEqual(testRequest);
      expect(singleRequest.regionId).toBe(regionId);
    }

    editRequests = await productionDataLayer.getAllEditRequests();
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(2);
    expect(editRequests).toStrictEqual(arrayContaining([testRequest, spoilerRequest]))

    editRequests = await productionDataLayer.getEditRequestsByStatus("Pending");
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(2);
    expect(editRequests).toStrictEqual(arrayContaining([testRequest, spoilerRequest]))

    let updateRequest = {
      id: testRequest.id,
      status: "Reviewed",
      regionId: testRequest.regionId,
      dateSubmitted: testRequest.dateSubmitted,
      dateUpdated: new Date(),
      submitter: testRequest.submitter
    };

    let requestAfterUpdate = await productionDataLayer.updateEditRequest(updateRequest);
    expect(requestAfterUpdate).toStrictEqual(
      objectContaining({
        ...testRequest,
        ...updateRequest
      })
    );

    let readRequestAfterUpdate = await productionDataLayer.getEditRequestById(testRequest.id);
    expect(readRequestAfterUpdate).toBeTruthy();
    expect(readRequestAfterUpdate).toStrictEqual(
      objectContaining({
        ...testRequest,
        ...updateRequest
      })
    );

    editRequests = await productionDataLayer.getEditRequestsByStatus("Reviewed");
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(1);
    expect(editRequests).toStrictEqual(arrayContaining([objectContaining({...testRequest, ...updateRequest, status: "Reviewed"})]))

    done();
  });
});
