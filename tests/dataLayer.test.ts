import {dataLayer, Region} from "../src/database/dataLayer";
import {firestore} from "../src/database/firestore";
import {Business} from "../src/endpoints/businesses";

afterEach(async() => {
  let bizDocs = (await firestore.collection("businesses").where("name", "==", "DummyBiz").get()).docs;
  bizDocs.forEach((d) => d.ref.delete());
  await firestore.collection("years").doc("2019").delete();
  await firestore.collection("regions").doc("DummyRegion").delete();
});

test("Creates and retrieves businesses", async (done) => {
  let biz : Business = {
    employees: 21,
    name: "DummyBiz",
    region: "DummyRegion",
    year_added: 2019
  };
  let id = (await dataLayer.setBusiness(biz)).id;
  expect(id).toBeTruthy();

  let out = await dataLayer.getBusinessesByRegion("DummyRegion");
  expect(out).toEqual(expect.arrayContaining([expect.objectContaining(biz)]));
  let filters = await dataLayer.getFilters();
  expect(filters).toEqual(expect.objectContaining({years: expect.arrayContaining([2019])}))
  done();
});

test("Creates and retrieves regions", async (done) => {
  let region: Region = {
    id: "DummyRegion",
    manager: "Dummy Manager"
  };

  let id = await dataLayer.setRegion(region);
  expect(id).toBeTruthy();

  let out = await dataLayer.getRegionsManagedBy("Dummy Manager");
  expect(out).toEqual(expect.arrayContaining([region]));
  done();
});
