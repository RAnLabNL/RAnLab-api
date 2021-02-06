import {registerAuth0} from "../src/auth0";
import fastify, {FastifyInstance} from "fastify";
import {addRoutes} from "../src/utils";
import createRegionsEndpoint from "../src/endpoints/regions";
import {DummyDatalayer} from "./utils/testDataLayer";
import fetch from "node-fetch";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import fastifySensible from "fastify-sensible";

process.env.AUTH0_CLAIMS_NAMESPACE="https://mun.ca";
process.env.TEST_AUTH0_DOMAIN= "dev-5ju75h98.us.auth0.com";
process.env.TEST_AUTH0_CLIENT_ID = "iqwBRZwwuKGz0BkHiInTWTyqvOFLepd6";
process.env.TEST_AUTH0_USERNAME = "liquiddark@gmail.com";
//process.env.TEST_AUTH0_PASSWORD should be set at runtime

describe("Auth0 integration works correctly", () => {
  let sut : FastifyInstance;
  beforeEach(() => {
    sut = fastify();
    registerAuth0(sut, process.env.TEST_AUTH0_DOMAIN);
    sut.register(fastifySensible);
    addRoutes(sut,
      () => createRegionsEndpoint(sut, new DummyDatalayer()),
      () => createBusinessesEndpoint(sut, new DummyDatalayer())
    );
  });
  afterEach(async (done) => {
    await sut.close();
    done();
  });
  it("Disallows an authenticated request", async(done) => {
    let response = await sut.inject({
      method: "GET",
      url: "/regions/DummyRegion",
    });
    expect(response.statusCode).toBe(401);
    done();
  });

  it("Allows an authenticated request for regions", async(done) => {
    let access_token = await authenticateToTestDomain();
    let response = await sut.inject({
      method: "GET",
      url: "/regions/manager/DummyManager",
      headers: {authorization: `Bearer ${access_token}` }
    });
    expect(response.statusCode).toBe(200);
    done();
  });

  it("Allows an authenticated request for businesses", async(done) => {
    let access_token = await authenticateToTestDomain();
    let response = await sut.inject({
      method: "GET",
      url: "/regions/DummyRegion/businesses",
      headers: {authorization: `Bearer ${access_token}` }
    });
    expect(response.statusCode).toBe(200);
    done();
  });

  it("Allows an authenticated request", async(done) => {
    let access_token = await authenticateToTestDomain();
    let response = await sut.inject({
      method: "GET",
      url: "/regions/DummyRegion",
      headers: {authorization: `Bearer ${access_token}` }
    });
    expect(response.statusCode).toBe(200);
    done();
  });

  async function authenticateToTestDomain() {
    let authResponse = await fetch(`https://${process.env.TEST_AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        client_id: process.env.TEST_AUTH0_CLIENT_ID,
        client_secret: process.env.TEST_AUTH0_CLIENT_SECRET,
        username: process.env.TEST_AUTH0_USERNAME,
        password: process.env.TEST_AUTH0_PASSWORD,
        audience: `https://testing-ranlab.com`,
        scope: 'read:sample',
        grant_type: "password"
      })
    });
    let response = await authResponse.json();
    let access_token = response.access_token;
    return access_token;
  }
});
