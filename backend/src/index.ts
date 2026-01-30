import { createServer } from 'http';
import app from './app';
import { config } from './config/env';
import { setupWebSocket } from './ws';

const PORT = config.port;
const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Auth: http://localhost:${PORT}/api/auth`);
  console.log(`  Calendars: http://localhost:${PORT}/api/calendars`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
});

export default server;
