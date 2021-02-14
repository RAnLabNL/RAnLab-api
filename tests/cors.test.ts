import {registerCorsHandler} from "../src/cors";
import { testify} from "./utils/testify";
import {DummyRegion} from "./utils/dummyData";


describe('CORS Handler Tests', function () {
  async function testCorsRequest(origin: string, originResponse: string | boolean) {
    let testApp = testify();
    registerCorsHandler(testApp);
    let response = await testApp.inject({
      method: 'OPTIONS',
      url: `/regions/${DummyRegion.name}/businesses`,
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
    await testCorsRequest("http://localhost:3000", "http://localhost:3000");
    done();
  });
  it("Does not accept requests from unapproved origin", async (done) => {
    await testCorsRequest('http://unapproved.com', false);
    done();
  });
});
