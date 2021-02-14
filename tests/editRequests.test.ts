import {DummyDatalayer} from "./utils/testDataLayer";
import { testify} from "./utils/testify";
import {createEditEndpoint} from "../src/endpoints/editRequests";
import {dummyRegionManagerToken, dummyTokenVerifier} from "./utils/dummyData";

describe("Edit Request unit tests", () => {

  let testDataLayer: DummyDatalayer
  it("Submitted edit requests are seen by region admin", async (done) => {
    testDataLayer = new DummyDatalayer();
    const testApp = testify();
    let editEndpoint = createEditEndpoint(testApp, testDataLayer, dummyTokenVerifier);

    const editResponse = await editEndpoint.inject({
      method: "POST",
      url: `/edits`,
      headers: {authorization: `Bearer ${dummyRegionManagerToken}`},
      payload: {
        adds: [],
        updates: [],
        deletes: []
      }
    });

    expect(editResponse.statusCode).toBe(201);
    expect(JSON.parse(editResponse.payload)).toStrictEqual(
      expect.objectContaining({
        editRequests: {
          adds: [],
          updates: [],
          deletes: []
        }
      })
    );

    await testApp.close();

    done();
  });
});
