import {productionDataLayer, Region} from "../src/database/productionDataLayer";
import {firestore} from "../src/database/firestore";
import {Business} from "../src/endpoints/businesses";

afterEach(async(done) => {
  let bizDocs = (await firestore.collection("businesses").where("name", "==", "DummyBiz").get()).docs;
  bizDocs.forEach((d) => d.ref.delete());
  await firestore.collection("years").doc("2019").delete();
  await firestore.collection("regions").doc("DummyRegion").delete();
  done();
});

test("Creates and retrieves businesses", async (done) => {
  let biz : Business = {
    employees: 21,
    name: "DummyBiz",
    region: "DummyRegion",
    year_added: 2019
  };
  let id = (await productionDataLayer.setBusiness(biz)).id;
  expect(id).toBeTruthy();

  let out = await productionDataLayer.getBusinessesByRegion("DummyRegion");
  expect(out).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));
  let filters = await productionDataLayer.getFilters();
  expect(filters).toEqual(expect.objectContaining({years: expect.arrayContaining([2019])}))
  done();
});

test("Creates and retrieves regions", async (done) => {
  let region: Region = {
    id: "DummyRegion",
    manager: "Dummy Manager"
  };

  let id = await productionDataLayer.setRegion(region);
  expect(id).toBeTruthy();

  let out = await productionDataLayer.getRegionsManagedBy("Dummy Manager");
  expect(out).toEqual(expect.arrayContaining([region]));
  done();
});
