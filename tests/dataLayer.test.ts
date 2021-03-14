import {ProductionDataLayer, Region} from "../src/database/productionDataLayer";
import {testFirestore} from "./testUtils/testFirestore";
import {Business, CHUNK_SIZE} from "../src/endpoints/businesses";
import objectContaining = jasmine.objectContaining;
import {EditRequest, PAGE_SIZE} from "../src/endpoints/editRequest";
import arrayContaining = jasmine.arrayContaining;
import {DummyBiz, DummyBizUpdate} from "./testUtils/dummyData";
import any = jasmine.any;

let productionDataLayer = new ProductionDataLayer(testFirestore);

describe("Production Data Layer Integration Tests", () => {
  const DUMMY_REGION_1 = "DummyRegion";
  const DUMMY_REGION_2 = "DummyRegion2";
  let regionId : string;

  beforeEach(async(done) => {
    (await testFirestore.collection("businesses").get()).docs.forEach((biz) => biz.ref.delete());
    (await testFirestore.collection("years").get()).docs.forEach(yr => yr.ref.delete());
    (await testFirestore.collection("editRequests").get()).docs.forEach(req => req.ref.delete());
    (await testFirestore.collection("regions").get()).docs.forEach(req => req.ref.delete());

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

    let byIdData = await productionDataLayer.getBusinessById(id);
    expect(byIdData).toEqual(expect.objectContaining({...biz}));

    let byRegionData = await productionDataLayer.getBusinessesByRegion(biz.regionId);
    expect(byRegionData).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));

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
      status: "Pending",
      adds:[DummyBiz],
      updates: [DummyBizUpdate],
      deletes: [],
    };

    let spoilerRequest : EditRequest = {
      regionId: `Not${regionId}`,
      submitter: "",
      status: "Pending",
      adds:[DummyBiz],
      updates: [DummyBizUpdate],
      deletes: [],
    };

    let {id} = await productionDataLayer.createEditRequest(testRequest);
    expect(id).toBeTruthy();
    testRequest.id = id;

    let {id:spoilerId} = await productionDataLayer.createEditRequest(spoilerRequest);
    expect(spoilerId).toBeTruthy();
    spoilerRequest.id = spoilerId;

    let matchForTestRequest : any = {...testRequest, dateSubmitted: any(Date), dateUpdated: any(Date)};
    let editRequests = await productionDataLayer.getEditRequestsForRegion(regionId);
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(1);
    expect(editRequests).toStrictEqual(arrayContaining([matchForTestRequest]));
    matchForTestRequest = editRequests[0];

    let singleRequest = await productionDataLayer.getEditRequestById(id);
    expect(singleRequest).toBeTruthy();
    if(!!singleRequest) {
      expect(singleRequest).toStrictEqual(matchForTestRequest);
      expect(singleRequest.regionId).toBe(regionId);
    }

    let matchForSpoilerRequest = {...spoilerRequest, dateSubmitted: any(Date), dateUpdated: any(Date)}
    editRequests = await productionDataLayer.getAllEditRequests();
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(2);
    expect(editRequests).toStrictEqual(arrayContaining([matchForTestRequest, matchForSpoilerRequest]))

    editRequests = await productionDataLayer.getEditRequestsByStatus("Pending");
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(2);
    expect(editRequests).toStrictEqual(arrayContaining([matchForTestRequest, matchForSpoilerRequest]))

    let updateRequest = {
      id: testRequest.id,
      status: "Reviewed",
      regionId: testRequest.regionId,
      submitter: testRequest.submitter
    };

    let requestAfterUpdate = await productionDataLayer.updateEditRequest(updateRequest);

    function dateGreaterThan(date: Date) {
      return (date2: Date) => date2 > date;
    }

    expect(requestAfterUpdate).toStrictEqual(
      objectContaining({
        ...matchForTestRequest,
        status: "Reviewed",
        dateUpdated: dateGreaterThan(matchForTestRequest.dateUpdated)
      })
    );

    let readRequestAfterUpdate = await productionDataLayer.getEditRequestById(testRequest.id);
    expect(readRequestAfterUpdate).toBeTruthy();
    expect(readRequestAfterUpdate).toStrictEqual(
      objectContaining({
        ...testRequest,
        status: "Reviewed",
        dateUpdated: dateGreaterThan(matchForTestRequest.dateUpdated)
      })
    );

    editRequests = await productionDataLayer.getEditRequestsByStatus("Reviewed");
    expect(editRequests).toBeTruthy();
    expect(editRequests.length).toBe(1);
    expect(editRequests).toStrictEqual(arrayContaining([objectContaining({...testRequest, ...updateRequest, status: "Reviewed"})]))

    done();
  });

  it("Paginates edit requests", async(done) => {
    let region: Region = {
      name: DUMMY_REGION_1,
      manager: "Dummy Manager"
    };
    regionId = (await productionDataLayer.setRegion(region)).id;

    let testRequest: EditRequest = {
      regionId: regionId,
      submitter: "first",
      status: "Pending",
      adds: [DummyBiz],
      updates: [DummyBizUpdate],
      deletes: [],
    };

    let {id: id2} = await productionDataLayer.createEditRequest({...testRequest, submitter: "second"});
    expect(id2).toBeTruthy();
    let secondPageEdit = {...testRequest, id: id2, submitter: "second"};

    let firstPageEdits = [];
    for(let i = 0; i < PAGE_SIZE; i++) {
      let {id} = await productionDataLayer.createEditRequest(testRequest);
      expect(id).toBeTruthy();
      testRequest.id = id;
      firstPageEdits.push({...testRequest, dateSubmitted: any(Date), dateUpdated: any(Date)});
    }
    let expectedFirstPageEdits = firstPageEdits.reverse();

    let firstPageRecords = await productionDataLayer.getAllEditRequests();
    expect(firstPageRecords).toStrictEqual(expectedFirstPageEdits);

    let firstPagePending = await productionDataLayer.getEditRequestsByStatus("Pending");
    expect(firstPagePending).toStrictEqual(expectedFirstPageEdits);

    let firstPageByRegion = await productionDataLayer.getEditRequestsForRegion(testRequest.regionId);
    expect(firstPageByRegion).toStrictEqual(expectedFirstPageEdits);

    let lastIdOnFirstPage = firstPageRecords[firstPageRecords.length-1].id;
    let matchForSecondPage = {...secondPageEdit, dateSubmitted: any(Date), dateUpdated: any(Date)};
    let secondPageRecords = await productionDataLayer.getAllEditRequests(lastIdOnFirstPage);
    expect(secondPageRecords).toStrictEqual([matchForSecondPage]);

    let secondPagePending = await productionDataLayer.getEditRequestsByStatus("Pending", lastIdOnFirstPage);
    expect(secondPagePending).toStrictEqual([matchForSecondPage]);

    let secondPageForRegion = await productionDataLayer.getEditRequestsForRegion(testRequest.regionId, lastIdOnFirstPage);
    expect(secondPageForRegion).toStrictEqual([matchForSecondPage]);

    await productionDataLayer.updateEditRequest({id: id2, regionId: testRequest.regionId, submitter: "first"});
    let firstPageForUser = await productionDataLayer.getEditRequestsByUser("first");
    expect(firstPageForUser).toStrictEqual(expectedFirstPageEdits);

    let secondPageForUser = await productionDataLayer.getEditRequestsByUser("first", lastIdOnFirstPage);
    expect(secondPageForUser).toStrictEqual([{...matchForSecondPage, submitter: "first"}]);

    done();
  });

  it("Retrieves businesses in chunks", async(done) => {
    async function addBiz(i: number) {
      let iBiz = {...DummyBiz, regionId, name:  `biz_${i}`};
      let doc = testFirestore.collection("businesses").doc();
      await doc.set(iBiz);
      expect(doc.id).toBeTruthy();
      return {...iBiz, id: doc.id};
    }
    jest.setTimeout(120000);

    let region: Region = {
      name: DUMMY_REGION_1,
      manager: "Dummy Manager"
    };
    regionId = (await productionDataLayer.setRegion(region)).id;

    let firstChunkPromises: Promise<Business>[] = [];
    let firstChunkBusinesses = [];

    for(let i = 0; i < CHUNK_SIZE; i++) {
      firstChunkPromises.push(addBiz(i));
      firstChunkBusinesses.push(...(await Promise.all(firstChunkPromises)));
      firstChunkPromises = [];
    }

    let secondChunkBiz = {...DummyBiz, regionId, name: `biz_999`};
    let{id: id2} = await productionDataLayer.setBusiness(secondChunkBiz);
    expect(id2).toBeTruthy();

    let firstChunk = await productionDataLayer.getAllBusinesses();
    expect(firstChunk).toStrictEqual(arrayContaining(firstChunkBusinesses));

    let secondChunk = await productionDataLayer.getAllBusinesses(firstChunk[CHUNK_SIZE -1].id);
    expect(secondChunk).toStrictEqual([{...secondChunkBiz, id: id2}])

    done();
  })
});
