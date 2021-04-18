import {authenticateToTestDomain, setupAuth0TestEnv, testify} from "./testUtils/testify";
import createUsersEndpoint from "../src/endpoints/users";
import { verifyJwt } from "../src/auth0";

describe("Auth0 user endpoint tests", () => {
  let userAccessToken: string;
  let adminAccessToken: string;
  it("Can get all users as regular or admin user", async (done) => {
    jest.setTimeout(15000);
    async function getAllUsers(token:string) {
      return await userApp.inject({
        method: "GET",
        url: "/users",
        headers: {authorization: `Bearer ${token}`}
      });
    }
    let server = testify();
    let userApp = createUsersEndpoint(server, verifyJwt);
    setupAuth0TestEnv();
    let authTokens = await authenticateToTestDomain();
    userAccessToken = authTokens.userAccessToken;
    adminAccessToken = authTokens.adminAccessToken;

    let userResponse = await getAllUsers(userAccessToken);
    expect(userResponse.statusCode).toBe(200);
    let userPayload = JSON.parse(userResponse.payload);
    expect(userPayload.users).toBeTruthy();
    expect(userPayload.users.length).toBeGreaterThanOrEqual(1);

    let adminResponse = await getAllUsers(adminAccessToken);
    expect(adminResponse.statusCode).toBe(200);
    let adminPayload = JSON.parse(adminResponse.payload);
    expect(adminPayload.users).toBeTruthy();
    expect(adminPayload.users.length).toBeGreaterThanOrEqual(1);

    done();
  });

  it("Can get single user by ID as regular or admin user", async (done) => {
    jest.setTimeout(15000);
    async function getUserById(id: string, token:string) {
      return await userApp.inject({
        method: "GET",
        url: `/users/${id}`,
        headers: {authorization: `Bearer ${token}`}
      });
    }
    let server = testify();
    let userApp = createUsersEndpoint(server, verifyJwt);
    setupAuth0TestEnv();
    let authTokens = await authenticateToTestDomain();
    userAccessToken = authTokens.userAccessToken;
    adminAccessToken = authTokens.adminAccessToken;

    const TEST_USER_ID = "601e3f8c531b71006cb088a2";

    let userResponse = await getUserById(TEST_USER_ID, userAccessToken);
    expect(userResponse.statusCode).toBe(200);
    expect(userResponse.payload).toBeTruthy();

    let adminResponse = await getUserById(TEST_USER_ID, adminAccessToken);
    expect(adminResponse.statusCode).toBe(200);
    expect(adminResponse.payload).toBeTruthy();

    done();
  });

  it("Can update a user as an admin but not a regular user", async (done) => {
    jest.setTimeout(15000);
    async function updateUser(id: string, updated: string, token:string) {
      return await userApp.inject({
        method: "POST",
        url: `/users/${id}`,
        payload: {user_metadata: {updated: updated}},
        headers: {authorization: `Bearer ${token}`}
      });
    }
    let server = testify();
    let userApp = createUsersEndpoint(server, verifyJwt);
    setupAuth0TestEnv();
    let authTokens = await authenticateToTestDomain();
    userAccessToken = authTokens.userAccessToken;
    adminAccessToken = authTokens.adminAccessToken;

    const TEST_USER_ID = "601e3f8c531b71006cb088a2";
    const updatedDate = new Date().toISOString();

    let userResponse = await updateUser(TEST_USER_ID, updatedDate, userAccessToken);
    expect(userResponse.statusCode).toBe(401);

    let adminResponse = await updateUser(TEST_USER_ID, updatedDate, adminAccessToken);
    expect(adminResponse.statusCode).toBe(200);
    let adminPayload = JSON.parse(adminResponse.payload);
    expect(adminPayload.user).toBeTruthy();
    expect(adminPayload.user.user_metadata.updated).toBe(updatedDate);

    done();
  });

  /*
      let userInfo = await getUserInfo(`Bearer ${userAccessToken}`);
    let userAppId = userInfo.userId.split("|")[1];

   */
});
