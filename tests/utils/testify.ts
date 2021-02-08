import fastify from "fastify";
import fastifyJWT, {FastifyJWTOptions} from "fastify-jwt";
import jwt from "jsonwebtoken";
import fastifySensible from "fastify-sensible";

export const AUTH0_CLAIMS_NAMESPACE = "https://mun.ca";
export const mockSecret = 'dummy';

export class MockAuth0Return {
  userId: string|null = null;
  admin: boolean = false;
  callCount: number = 0;
}

export function setupAuth0TestEnv() {
  process.env.AUTH0_CLAIMS_NAMESPACE = AUTH0_CLAIMS_NAMESPACE;
  process.env.TEST_AUTH0_DOMAIN = "dev-5ju75h98.us.auth0.com";
  process.env.TEST_AUTH0_CLIENT_ID = "iqwBRZwwuKGz0BkHiInTWTyqvOFLepd6";
  process.env.TEST_AUTH0_USERNAME = "liquiddark@gmail.com";
  process.env.TEST_AUTH0_ADMIN_USERNAME = "burton.technical.709@gmail.com";

// process.env.TEST_AUTH0_PASSWORD must be set in local runtime environment
// process.env.TEST_AUTH0_ADMIN_PASSWORD must be set in local runtime environment
// process.env.TEST_AUTH0_CLIENT_SECRET must be set in local runtime environment
}

export function getMockToken(payload: {userId: string, admin: boolean  }) {
  let token : any = {};
  token['sub'] = `auth0|${payload.userId}`;
  token[`${AUTH0_CLAIMS_NAMESPACE}/admin`] = payload.admin;
  return jwt.sign(token, mockSecret)
}

export const testify = (mockAuth0Return : MockAuth0Return) => {
  const f = fastify();
  f.register(fastifyJWT, <FastifyJWTOptions>{
    secret: (_request, _reply, _provider) => { mockAuth0Return.callCount++; _provider(null, mockSecret);},
    audience: 'https://localhost',
    issuer: 'https://localhost/',
    algorithms: ['none'],
    decode: { complete: true },
  });
  f.register(fastifySensible);
  return f;
};
