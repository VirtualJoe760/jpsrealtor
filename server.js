/**
 * Custom Next.js Server with Socket.io
 *
 * This server initializes Socket.io alongside Next.js
 * for real-time messaging capabilities
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  // Note: We're using dynamic import here because socket.ts is TypeScript
  // In production, this will be compiled to JavaScript
  const initSocketIO = async () => {
    try {
      const { initSocket } = await import('./src/server/socket.js');
      initSocket(server);
      console.log('[Server] Socket.io initialized successfully');
    } catch (error) {
      console.error('[Server] Failed to initialize Socket.io:', error);
      console.log('[Server] Continuing without Socket.io...');
    }
  };

  server.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   🚀 Server ready!                    ║
║                                       ║
║   ➜ Local:    http://localhost:${port}  ║
║   ➜ Network:  http://192.168.x.x:${port}║
║                                       ║
║   📡 Socket.io: Enabled               ║
║                                       ║
╚═══════════════════════════════════════╝
    `);

    // Initialize Socket.io after server starts
    initSocketIO();
  });

  server.on('error', (err) => {
    console.error('[Server] Error:', err);
    process.exit(1);
  });
});
