/**
 * Custom Next.js Server with Socket.io
 *
 * This server initializes Socket.io alongside Next.js
 * for real-time messaging capabilities
 */

const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ---------------------------------------------------------------------------
// Dev only: heal the stale route table Next < 16.4 can publish at startup.
// ---------------------------------------------------------------------------
// Next's dev server rebuilds its route table on every Watchpack aggregation,
// in async handlers nothing serializes. When the initial scan of src/app is
// slow (cold disk, busy machine) it arrives in several aggregations, and if
// the handler for an early, PARTIAL one finishes last, its table wins: every
// route deeper than that scan had reached serves Next's HTML 404 page — for
// the whole session, since nothing rebuilds the table until a file changes.
// On 2026-10-15 that 404'd every /api route 4+ segments deep (all the
// /api/skill data routes, so the local MCP server could call nothing) while
// /api/skill/me worked, and left .next/dev/types/routes.d.ts half-overwritten
// so `tsc --noEmit` failed. Next 16.4.0 fixed it upstream (setup-dev-bundler
// skips partial startup passes). Until we upgrade: once the server is up,
// check a deep route and the generated route types; if either is stale, bump
// one route file's mtime — the extra pass sees the whole tree and republishes
// the table and routes.d.ts.
const ROUTE_PROBE_PATH = '/api/skill/listings/__route-table-probe__/photos';
const ROUTE_PROBE_FILE = path.join(__dirname, 'src', 'app', 'api', 'skill', 'listings', '[listingKey]', 'photos', 'route.ts');
const APP_DIR = path.join(__dirname, 'src', 'app');
const ROUTE_TYPES_FILE = path.join(__dirname, '.next', 'dev', 'types', 'routes.d.ts');

// 5 segments deep and token-gated: a healthy table answers 401 JSON before the
// handler touches the DB. Only Next's own HTML 404 means the route is missing.
async function deepRouteIs404() {
  const res = await fetch(`http://127.0.0.1:${port}${ROUTE_PROBE_PATH}`, {
    signal: AbortSignal.timeout(300000), // first compile on a loaded machine has taken 76s
  });
  await res.arrayBuffer();
  return res.status === 404 && (res.headers.get('content-type') || '').includes('text/html');
}

// Every page/route file on disk must appear in the generated route types. A
// half-overwritten routes.d.ts is the shorter, partial list plus a leftover
// tail, so a missing route also catches that corruption.
function routeTypesAreIncomplete() {
  let types;
  try {
    types = fs.readFileSync(ROUTE_TYPES_FILE, 'utf8');
  } catch {
    return true;
  }
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).some((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/^(page|route)\.(tsx?|jsx?|mdx)$/.test(entry.name)) return false;
    const route = '/' + path.relative(APP_DIR, dir).split(path.sep).join('/');
    return !types.includes(`"${route}"`);
  });
  return walk(APP_DIR);
}

async function guardDevRouteTable() {
  try {
    for (let rescans = 0; ; rescans++) {
      const stale = (await deepRouteIs404()) || routeTypesAreIncomplete();
      if (!stale) {
        if (rescans) console.log(`[Server] Dev route table healed after ${rescans} rescan(s).`);
        return;
      }
      if (rescans === 3) {
        console.error('[Server] Dev route table is still stale — deep routes will 404. Restart `npm run dev`.');
        return;
      }
      console.warn('[Server] Dev route table is stale (Next <16.4 startup race) — forcing a rescan.');
      const now = new Date();
      fs.utimesSync(ROUTE_PROBE_FILE, now, now);
      await new Promise((resolve) => setTimeout(resolve, 2000 * (rescans + 1)));
    }
  } catch (err) {
    console.warn('[Server] Dev route-table check skipped:', err.message);
  }
}

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

    if (dev) guardDevRouteTable();
  });

  server.on('error', (err) => {
    console.error('[Server] Error:', err);
    process.exit(1);
  });
});
