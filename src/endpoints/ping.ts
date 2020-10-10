import type { FastifyInstance } from 'fastify';

export default function createPingEndpoint(app: FastifyInstance) {
  app.get('/ping', async () => `${JSON.stringify({ status: 'ok', date: Date.now() })}\n`);

  return app;
}
