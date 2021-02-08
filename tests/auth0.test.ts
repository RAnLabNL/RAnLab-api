import {registerAuth0} from "../src/auth0";
import fastify, {FastifyInstance} from "fastify";
import {addRoutes} from "../src/utils";
import createRegionsEndpoint from "../src/endpoints/regions";
import {DummyDatalayer} from "./utils/testDataLayer";
import fetch from "node-fetch";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import fastifySensible from "fastify-sensible";
import {setupAuth0TestEnv} from "./utils/testify";
import jwtDecode from "jwt-decode";
import {DummyRegion} from "./utils/dummyData";
import {DataLayer} from "../src/database/productionDataLayer";

describe("Auth0 integration tests", () => {
  let sut : FastifyInstance;
  let userAccessToken : string;
  let adminAccessToken: string;

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
        headers: {authorization: `Bearer ${userAccessToken}` }
      });
      expect(response.statusCode).toBe(200);
      done();
    });

    it("Allows an authenticated request for a region by ID", async(done) => {
      let response = await sut.inject({
        method: "GET",
        url: "/regions/DummyRegion",
        headers: {authorization: `Bearer ${userAccessToken}` }
      });
      expect(response.statusCode).toBe(200);
      done();
    });
  });

  describe("Business Tests", () => {
    let testDataLayer: DataLayer;
    beforeEach(() => {
      testDataLayer = new DummyDatalayer();
      addRoutes(sut,
        () => createBusinessesEndpoint(sut, testDataLayer),
        () => createRegionsEndpoint(sut, testDataLayer)
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
      let userId = jwtDecode<string>(userAccessToken).sub.toString().split("|")[1];
      let authRegion = {...DummyRegion};
      authRegion.manager = userId
      let regionsResponse = await sut.inject({
        method: 'POST',
        url: `/regions`,
        payload: authRegion,
        headers:{authorization: `Bearer ${adminAccessToken}`}
      });
      console.log(regionsResponse);

      let response = await sut.inject({
        method: "GET",
        url: `/regions/${DummyRegion.name}/businesses`,
        headers: {authorization: `Bearer ${userAccessToken}`}
      });
      expect(response.statusCode).toBe(200);
        done();
    });
  });

  async function authenticateToTestDomain() {
    let userResponse = await fetch(`https://${process.env.TEST_AUTH0_DOMAIN}/oauth/token`, {
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
    userAccessToken = (await userResponse.json()).access_token;
    let adminResponse = await fetch(`https://${process.env.TEST_AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        client_id: process.env.TEST_AUTH0_CLIENT_ID,
        client_secret: process.env.TEST_AUTH0_CLIENT_SECRET,
        username: process.env.TEST_AUTH0_ADMIN_USERNAME,
        password: process.env.TEST_AUTH0_ADMIN_PASSWORD,
        audience: `https://testing-ranlab.com`,
        scope: 'read:sample',
        grant_type: "password"
      })
    });
    adminAccessToken = (await adminResponse.json()).access_token;
  }
});
