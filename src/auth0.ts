import {FastifyInstance} from "fastify";
import fastifySecretProvider from 'fastify-authz-jwks';
import fastifyJwt, {FastifyJWTOptions} from 'fastify-jwt';

export function registerAuth0(fastify: FastifyInstance) {
  const faSecretProvider = fastifySecretProvider({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: 'http://lesleychard.auth0.com/.well-known/jwks.json'
  });

  fastify.register(fastifyJwt, <FastifyJWTOptions>{
    secret: faSecretProvider,
    audience: 'https://api.example.com',
    issuer: 'https://lesleychard.auth0.com/',
    algorithms: ['RS256'],
    decode: { complete: true },
  });
}
