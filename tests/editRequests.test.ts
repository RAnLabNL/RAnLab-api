import {DummyDatalayer} from "./utils/testDataLayer";
import {getMockToken, MockAuth0Return, testify} from "./utils/testify";
import {createEditEndpoint} from "../src/endpoints/editRequests";

describe("Edit Request tests", () => {

  let testDataLayer: DummyDatalayer
  it("Submitted edit requests are seen by region admin", async (done) => {
    testDataLayer = new DummyDatalayer();
    let mockAuth0 = new MockAuth0Return();
    const testApp = testify(mockAuth0);
    mockAuth0.userId = "nobody";
    let editEndpoint = createEditEndpoint(testApp, testDataLayer);

    const editResponse = await editEndpoint.inject({
      method: "POST",
      url: `/edits`,
      headers: {authorization: `Bearer ${getMockToken({userId: mockAuth0.userId, admin: false})}`},
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
