declare module "fastify-authz-jwks" {
  import {FastifyReply, FastifyRequest} from "fastify";
  export type SecretCB = (e: Error | null, secret: string | undefined) => void;
  export default function fastifyJwtSecret(
    options: {}
  ): (request : FastifyRequest, token : FastifyReply, cb: SecretCB) => void;
};
