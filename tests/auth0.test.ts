import fastify, {FastifyInstance} from "fastify";
import {addRoutes} from "../src/utils";
import createRegionsEndpoint from "../src/endpoints/regions";
import {DummyDatalayer} from "./testUtils/testDataLayer";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import fastifySensible from "fastify-sensible";
import {authenticateToTestDomain, setupAuth0TestEnv} from "./testUtils/testify";
import {DummyRegion} from "./testUtils/dummyData";
import {DataLayer} from "../src/database/productionDataLayer";
import {
  deleteCachedUser,
  getUserInfo,
  ICacheEntry,
  verifyJwt,
  verifyJwtCached
} from "../src/auth0";

describe("Auth0 unit tests", () => {
  it("Pulls cached credentials when possible", async () => {
    const TEST_AUTH_HEADER = "Test";
    let userCalls = 0;
    let roleCalls = 0;
    let testData = {
      userAppId: "testUser",
      role: "testRole",
      admin: false
    };

    async function testCachedVerify(cache: Map<string,ICacheEntry>) {
        let v = await verifyJwtCached(
          TEST_AUTH_HEADER,
          cache,
          () => {
            userCalls++;
            return Promise.resolve({userId: testData.userAppId})
          },
          () => {
            roleCalls++;
            return Promise.resolve({role: testData.role})
          }
        );

        expect(userCalls).toBe(1);
        expect(roleCalls).toBe(1);
        expect(v).toStrictEqual(testData);
    }
    let cache = new Map<string, ICacheEntry>();
    await testCachedVerify(cache);
    await testCachedVerify(cache);
    deleteCachedUser(TEST_AUTH_HEADER);
    await testCachedVerify(cache);
  });
});

describe("Auth0 integration tests", () => {
  let sut : FastifyInstance;
  let userAccessToken : string;
  let adminAccessToken: string;
  let userAppId: string;

  beforeAll(async (done) => {
    setupAuth0TestEnv();
    let authTokens = await authenticateToTestDomain();
    userAccessToken = authTokens.userAccessToken;
    adminAccessToken = authTokens.adminAccessToken;
    let userInfo = await getUserInfo(`Bearer ${userAccessToken}`);
    userAppId = userInfo.userId.split("|")[1];
    done();
  });

  beforeEach(() => {
    sut = fastify();

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
        () => createRegionsEndpoint(sut, new DummyDatalayer(), verifyJwt),
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
        () => createBusinessesEndpoint(sut, testDataLayer, verifyJwt),
        () => createRegionsEndpoint(sut, testDataLayer, verifyJwt)
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
      let authRegion = {...DummyRegion};
      authRegion.manager = userAppId
      let regionsResponse = await sut.inject({
        method: 'POST',
        url: `/regions`,
        payload: authRegion,
        headers:{authorization: `Bearer ${adminAccessToken}`}
      });
      expect(regionsResponse.statusCode).toBe(201);
      DummyRegion.id = JSON.parse(regionsResponse.payload).id;

      let response = await sut.inject({
        method: "GET",
        url: `/regions/${DummyRegion.name}/businesses`,
        headers: {authorization: `Bearer ${userAccessToken}`}
      });
      expect(response.statusCode).toBe(200);
        done();
    });
  });
});
