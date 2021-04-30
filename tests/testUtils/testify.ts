import fastify, {FastifyRequest} from "fastify";
import fastifyJWT, {FastifyJWTOptions} from "fastify-jwt";
import jwt from "jsonwebtoken";
import fastifySensible from "fastify-sensible";
import fetch from "node-fetch";

export const AUTH0_CLAIMS_NAMESPACE = "https://mun.ca";
export const mockSecret = 'dummy';

export function setupAuth0TestEnv() {
  process.env.AUTH0_CLAIMS_NAMESPACE = AUTH0_CLAIMS_NAMESPACE;
  process.env.AUTH0_DOMAIN = "dev-5ju75h98.us.auth0.com";
  process.env.AUTH0_CLIENT_ID = "iqwBRZwwuKGz0BkHiInTWTyqvOFLepd6";
  process.env.AUTH0_MGMT_CLIENT_ID = "HU171Qtg3j3395vGXuNsgmRq8XQPbKzT";
  process.env.TEST_AUTH0_USERNAME = "liquiddark@gmail.com";
  process.env.TEST_AUTH0_ADMIN_USERNAME = "burton.technical.709@gmail.com";

// process.env.TEST_AUTH0_PASSWORD must be set in local runtime environment
// process.env.TEST_AUTH0_ADMIN_PASSWORD must be set in local runtime environment
// process.env.TEST_AUTH0_CLIENT_SECRET must be set in local runtime environment
}

export async function authenticateToTestDomain() {
  let userResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      username: process.env.TEST_AUTH0_USERNAME,
      password: process.env.TEST_AUTH0_PASSWORD,
      scope: 'openid',
      grant_type: "password"
    })
  });
  let userJson = await userResponse.json()
  let userAccessToken = userJson.access_token;
  let adminResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      username: process.env.TEST_AUTH0_ADMIN_USERNAME,
      password: process.env.TEST_AUTH0_ADMIN_PASSWORD,
      scope: 'openid',
      grant_type: "password"
    })
  });
  let adminJson = await adminResponse.json();
  let adminAccessToken = adminJson.access_token;
  return {userAccessToken, adminAccessToken};
}


export function getMockToken(payload: {userAppId: string, admin: boolean  }) {
  let token : any = {};
  token['sub'] = `auth0|${payload.userAppId}`;
  token[`${AUTH0_CLAIMS_NAMESPACE}/admin`] = payload.admin;
  return jwt.sign(token, mockSecret)
}

export function getTestJwtVerifier(userAppId: string, admin: boolean) {
  return async(_: FastifyRequest) => ({userAppId, admin, role: admin ? "admin" : "region" });
}

export const testify = () => {
  const f = fastify({logger: {level: "debug"}});
  f.register(fastifyJWT, <FastifyJWTOptions>{
    secret: (_request, _reply, _provider) => { _provider(null, mockSecret);},
    audience: 'https://localhost',
    issuer: 'https://localhost/',
    algorithms: ['none'],
    decode: { complete: true },
  });
  f.register(fastifySensible);
  return f;
};
