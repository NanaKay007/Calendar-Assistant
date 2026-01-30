import app from './app';
import { config } from './config/env';

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Auth: http://localhost:${PORT}/api/auth`);
  console.log(`  Calendars: http://localhost:${PORT}/api/calendars`);
});

export default app;
