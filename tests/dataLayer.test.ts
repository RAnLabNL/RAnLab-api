import {productionDataLayer, Region} from "../src/database/productionDataLayer";
import {firestore} from "../src/database/firestore";
import {Business} from "../src/endpoints/businesses";

beforeEach(async(done) => {
  let bizDocs = (await firestore.collection("businesses").where("name", "==", "DummyBiz").get()).docs;
  bizDocs.forEach((d) => d.ref.delete());
  await firestore.collection("years").doc("2019").delete();
  await firestore.collection("regions").doc("DummyRegion").delete();
  done();
});

it("Creates, retrieves, updates, and deletes businesses", async (done) => {
  let biz : Business = {
    employees: 1,
    name: "DummyBiz",
    region: "DummyRegion",
    year_added: 2019
  };
  let id = (await productionDataLayer.setBusiness(biz)).id;
  expect(id).toBeTruthy();

  let bizData = await productionDataLayer.getBusinessesByRegion(biz.region);
  expect(bizData).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));

  let filters = await productionDataLayer.getFilters(biz.region);
  expect(filters).toEqual(expect.objectContaining({years: expect.arrayContaining([biz.year_added])}))

  biz.id = id;
  biz.employees = 2;
  biz.year_added = 2020;
  let updatedId = (await productionDataLayer.setBusiness(biz)).id;
  expect(updatedId).toEqual(id);

  let updatedBizData = await productionDataLayer.getBusinessesByRegion(biz.region);
  expect(updatedBizData).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));

  let updatedFilters = await productionDataLayer.getFilters(biz.region);
  expect(updatedFilters).toEqual(expect.objectContaining({years: expect.arrayContaining([biz.year_added])}))

  await productionDataLayer.deleteBusiness(biz.id);
  let emptyBizData = await productionDataLayer.getBusinessesByRegion(biz.region);
  expect(emptyBizData).toEqual([]);

  let emptyFilters = await productionDataLayer.getFilters(biz.region);
  expect(emptyFilters.years).toEqual([]);

  done();
});

it("Creates, retrieves, updates, and deletes regions", async (done) => {
  let region: Region = {
    id: "DummyRegion",
    manager: "Dummy Manager"
  };

  let id = await productionDataLayer.setRegion(region);
  expect(id).toBeTruthy();

  let out = await productionDataLayer.getRegionsManagedBy("Dummy Manager");
  expect(out).toEqual(expect.arrayContaining([region]));

  region.manager = "New Manager";
  let updatedId = (await productionDataLayer.setRegion(region));
  expect(updatedId.id).toEqual(region.id);

  let oldManagerRegions = await productionDataLayer.getRegionsManagedBy("Dummy Manager");
  expect(oldManagerRegions).toEqual(expect.arrayContaining([]));

  let newManagerRegions = await productionDataLayer.getRegionsManagedBy(region.manager);
  expect(newManagerRegions).toEqual(expect.arrayContaining([region]));

  await productionDataLayer.deleteRegion(region.id);
  let empty = await productionDataLayer.getRegionsManagedBy(region.manager);
  expect(empty).toEqual([]);

  done();
});
