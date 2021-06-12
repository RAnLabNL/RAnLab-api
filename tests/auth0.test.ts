import fastify, {FastifyInstance} from "fastify";
import fastifySensible from "fastify-sensible";
import {IMock, It, Mock, Times} from "typemoq"

import {addRoutes} from "../src/utils";
import createRegionsEndpoint from "../src/endpoints/regions";
import {DummyDatalayer} from "./testUtils/testDataLayer";
import {createBusinessesEndpoint} from "../src/endpoints/businesses";
import {authenticateToTestDomain, getEmptyCacheJwtVerifier, setupAuth0TestEnv} from "./testUtils/testify";
import {DummyRegion} from "./testUtils/dummyData";
import {DataLayer} from "../src/database/productionDataLayer";
import {Auth0JwtVerifier, getJwtVerifier} from "../src/auth0";
import {getUserIdFromAuth0} from "../src/dependencies/auth0Api";


describe("Auth0 unit tests", () => {
  const TEST_AUTH_TOKEN = "Test"
  const TEST_AUTH_HEADER = `Bearer ${TEST_AUTH_TOKEN}`;
  const TEST_USER_ID = "testUser";
  const TEST_AUTH0_ID = "auth0|" + TEST_USER_ID
  const TEST_ROLE = "testRole";
  let testData = {
    userAppId: TEST_USER_ID,
    role: TEST_ROLE,
    admin: false
  };
  let infoGetter = async (_: string) => "";

  let sut : Auth0JwtVerifier;
  let mockIdGetter: IMock<(authHeader: string) => Promise<string>>;
  let mockRoleGetter: IMock<(userId: string) => Promise<string>>;
  let mockCache: IMock<DataLayer>;

  beforeEach(() => {
    mockIdGetter = Mock.ofInstance(infoGetter);
    mockRoleGetter = Mock.ofInstance(infoGetter);
    mockCache = Mock.ofType<DataLayer>();
    sut = getJwtVerifier(mockCache.object, mockIdGetter.object, mockRoleGetter.object);
  });

  it("Pulls cached credentials first", async () => {
    mockCache.setup(c => c.getUserInfo(It.isAnyString())).returns((_: string) => Promise.resolve(testData));
    mockIdGetter.setup(g => g(It.isAnyString())).returns(_ => Promise.resolve(TEST_AUTH0_ID));
    mockRoleGetter.setup(g => g(It.isAnyString())).returns(_ => Promise.resolve(TEST_ROLE));

    let data = await sut({ headers: { authorization: TEST_AUTH_HEADER } });
    expect(data).toStrictEqual(testData);
    mockIdGetter.verify(g => g(TEST_AUTH_HEADER), Times.never());
    mockRoleGetter.verify(g => g("dummyUser"), Times.never())
  });

  it("Fetches from auth0 and adds to cache when not initially cached", async () => {
    mockCache.setup(c => c.getUserInfo(TEST_AUTH_HEADER)).returns((_: string) => Promise.resolve(null));
    mockCache.setup(c => c.setUserInfo(TEST_AUTH_HEADER, It.isAny()));
    mockIdGetter.setup(g => g(It.isAnyString())).returns(_ => Promise.resolve(TEST_AUTH0_ID));
    mockRoleGetter.setup(g => g(It.isAnyString())).returns(_ => Promise.resolve(TEST_ROLE));

    let data = await sut({ headers: { authorization: TEST_AUTH_HEADER } });
    expect(data).toStrictEqual(testData);
    mockCache.verify(c => c.setUserInfo(TEST_AUTH_TOKEN, It.isValue(testData)), Times.once());
    mockIdGetter.verify(g => g(TEST_AUTH_HEADER), Times.once());
    mockRoleGetter.verify(g => g(TEST_AUTH0_ID), Times.once())
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
    let userId = await getUserIdFromAuth0(`Bearer ${userAccessToken}`);
    userAppId = userId.split("|")[1];
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
    let verifyJwt: Auth0JwtVerifier;
    beforeEach(() => {
      verifyJwt = getEmptyCacheJwtVerifier();
      addRoutes(
        sut,
        () => createRegionsEndpoint(sut, new DummyDatalayer(), verifyJwt)
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
    let verifyJwt: Auth0JwtVerifier;
    beforeEach(() => {
      verifyJwt = getEmptyCacheJwtVerifier();
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
