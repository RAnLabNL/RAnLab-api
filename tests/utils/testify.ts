import fastify from "fastify";
import fastifyJWT, {FastifyJWTOptions} from "fastify-jwt";
import jwt from "jsonwebtoken";

export const mockSecret = 'dummy';
export const mockAuth0Return = {
  user: <string|null>null,
  callCount: 0
};

export function getMockToken(payload: object) {
  return  jwt.sign(payload, mockSecret)
}

export const testify = () => {
  const f = fastify();
  f.register(fastifyJWT, <FastifyJWTOptions>{
    secret: (_request, _reply, _provider) => { mockAuth0Return.callCount++; _provider(null, mockSecret);},
    audience: 'https://localhost',
    issuer: 'https://localhost/',
    algorithms: ['RS256'],
    decode: { complete: true },
  });
  return f;
};
