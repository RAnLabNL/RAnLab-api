import {FastifyInstance, FastifyRequest} from "fastify";
import fastifySecretProvider from 'fastify-authz-jwks';
import fastifyJwt, {FastifyJWTOptions} from 'fastify-jwt';

export function registerAuth0(fastify: FastifyInstance, tenant = process.env.AUTH0_DOMAIN) {
  const faSecretProvider = fastifySecretProvider({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `http://${tenant}/.well-known/jwks.json`
  });

  fastify.register(fastifyJwt, <FastifyJWTOptions>{
    secret: faSecretProvider,
    audience: 'https://api.example.com',
    issuer: `https://${tenant}/`,
    algorithms: ['RS256'],
    decode: { complete: true },
  });
}

export async function verifyJwt(request: FastifyRequest) {
  let jwt = <any>(await request.jwtVerify());
  let userId = <string>jwt[`sub`].split("|")[1];
  let admin = jwt[`${process.env.AUTH0_CLAIMS_NAMESPACE}/admin`];
  return {userId, admin};
}
