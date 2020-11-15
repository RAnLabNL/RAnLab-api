import {dataLayer} from "../src/database/dataLayer";

test("Gets expected data", () => {
  let out = dataLayer.getBusinesses({businesses: [{name:"dummy"}]});

  expect(out).toStrictEqual([{name:"dummy"}]);
});
