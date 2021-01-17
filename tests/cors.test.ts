import {registerCorsHandler} from "../src/cors";
import {MockAuth0Return, testify} from "./utils/testify";
import {DummyRegion} from "./utils/dummyData";


describe('CORS Handler Tests', function () {
  async function testCorsRequest(origin: string, originResponse: string | boolean) {
    let mockReturn = new MockAuth0Return();
    let testApp = testify(mockReturn);
    mockReturn.user = "Dummy";
    registerCorsHandler(testApp);
    let response = await testApp.inject({
      method: 'OPTIONS',
      url: `/regions/${DummyRegion.id}/businesses`,
      headers: {
        'authorization': 'Bearer abc123',
        'access-control-request-headers': 'x-requested-with',
        'access-control-request-method': 'GET',
        origin: origin
      }
    });

    expect(response.headers["access-control-allow-origin"]).toBe(originResponse);
    await testApp.close();
  }

  it("Accepts localhost requests", async (done) => {
    await testCorsRequest("http://localhost", "http://localhost");
    done();
  });
  it("Does not accept requests from unapproved origin", async (done) => {
    await testCorsRequest('http://unapproved.com', false);
    done();
  });
});
