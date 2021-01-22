import fastify from "fastify";
import fastifyJWT, {FastifyJWTOptions} from "fastify-jwt";
import jwt from "jsonwebtoken";
import fastifySensible from "fastify-sensible";

export const mockSecret = 'dummy';
export class MockAuth0Return {
  userId: string|null = null;
  callCount: number = 0;
  reset() {
    this.callCount = 0;
    this.userId = null
  }
}

export function getMockToken(payload: object) {
  return  jwt.sign(payload, mockSecret)
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
