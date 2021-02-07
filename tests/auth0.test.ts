import {registerAuth0} from "../src/auth0";
import fastify, {FastifyInstance} from "fastify";
import {addRoutes} from "../src/utils";
import createRegionsEndpoint from "../src/endpoints/regions";
import {DummyDatalayer} from "./utils/testDataLayer";
import fetch from "node-fetch";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import fastifySensible from "fastify-sensible";
import {setupAuth0TestEnv} from "./utils/testify";

describe("Auth0 integration tests", () => {
  let sut : FastifyInstance;
  let access_token : string;

  beforeAll(async (done) => {
    setupAuth0TestEnv()
    await authenticateToTestDomain();
    done();
  });

  beforeEach(() => {
    sut = fastify();
    registerAuth0(sut, process.env.TEST_AUTH0_DOMAIN);

    // fastifySensible gives us the decorator function needed when rejecting unauthorized reqs
    sut.register(fastifySensible);
  });

  afterEach(async (done) => {
    await sut.close();
    done();
  });

  describe("Region Tests", () => {
    beforeEach(() => {
      addRoutes(sut,
        () => createRegionsEndpoint(sut, new DummyDatalayer()),
      );
    });

    it("Disallows an unauthenticated request", async(done) => {
      let response = await sut.inject({
        method: "GET",
        url: "/regions/DummyRegion",
      });
      expect(response.statusCode).toBe(401);
      done();
    });

    it("Allows an authenticated request for regions by manager", async(done) => {
      let response = await sut.inject({
        method: "GET",
        url: "/regions/manager/DummyManager",
        headers: {authorization: `Bearer ${access_token}` }
      });
      expect(response.statusCode).toBe(200);
      done();
    });

    it("Allows an authenticated request for a region by ID", async(done) => {
      let response = await sut.inject({
        method: "GET",
        url: "/regions/DummyRegion",
        headers: {authorization: `Bearer ${access_token}` }
      });
      expect(response.statusCode).toBe(200);
      done();
    });
  });

  describe("Business Tests", () => {
    beforeEach(() => {
      addRoutes(sut,
        () => createBusinessesEndpoint(sut, new DummyDatalayer()),
      );
    });

    it("Disallows an unauthenticated request", async(done) => {
      let response = await sut.inject({
        method: "GET",
        url: "/regions/DummyRegion/businesses",
      });
      expect(response.statusCode).toBe(401);
      done();
    });

    it("Allows an authenticated request for businesses", async (done) => {
      let response = await sut.inject({
        method: "GET",
        url: "/regions/DummyRegion/businesses",
        headers: {authorization: `Bearer ${access_token}`}
      });
      expect(response.statusCode).toBe(200);
        done();
    });
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
    access_token = (await authResponse.json()).access_token;
  }
});
