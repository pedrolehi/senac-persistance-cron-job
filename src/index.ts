import { fastify } from 'fastify';
import { connectToMongoDB } from './utils/mongo';
import { logsRoute } from './routes/logs.route';
import { assistantRoute } from './routes/assistant.route';
import { discoveryRoute } from './routes/discovery.route';
import { syncRoute } from './routes/sync.route';

const app = fastify();

app.register(logsRoute);
app.register(assistantRoute);
app.register(discoveryRoute);
app.register(syncRoute);

async function start() {
  try {
    await connectToMongoDB();
    await app.listen({ port: 3000 });
    console.log('Server running on port 3000');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
