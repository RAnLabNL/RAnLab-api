import fastify from 'fastify';

const port = Number(process.env.PORT || 8080);
const server = fastify();

server.get('/ping', async () => `${JSON.stringify({ status: 'ok', date: Date.now() })}\n`);

server.listen(port, '::', (err, address) => {
  if (err) {
    console.error(err);
    process.exitCode = 1;
  } else {
    console.log(`Server listening at ${address}`);
  }
});
