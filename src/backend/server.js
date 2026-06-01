import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { config } from './config.js';
import { createFeature, createFeedback, listFeatures, listFeedback, updateFeatureStatus } from './db.js';
import { readJson, sendError, sendJson } from './http.js';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

const allowedStatuses = new Set(['planned', 'building', 'shipped']);
const allowedPriorities = new Set(['low', 'medium', 'high']);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    sendError(response, 500, 'Unexpected server error');
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Product starter running at http://${config.host}:${config.port}`);
});

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      environment: config.env,
      database: config.databasePath
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/features') {
    sendJson(response, 200, { features: listFeatures() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/features') {
    const body = await readJson(request);
    const title = String(body.title || '').trim();
    const priority = String(body.priority || 'medium');

    if (!title) {
      sendError(response, 400, 'Feature title is required');
      return;
    }

    if (!allowedPriorities.has(priority)) {
      sendError(response, 400, 'Priority must be low, medium, or high');
      return;
    }

    sendJson(response, 201, {
      feature: createFeature({
        title,
        description: String(body.description || ''),
        priority
      })
    });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/features\/(\d+)\/status$/);
  if (request.method === 'PATCH' && statusMatch) {
    const body = await readJson(request);
    const status = String(body.status || '');

    if (!allowedStatuses.has(status)) {
      sendError(response, 400, 'Status must be planned, building, or shipped');
      return;
    }

    const feature = updateFeatureStatus(Number(statusMatch[1]), status);
    if (!feature) {
      sendError(response, 404, 'Feature not found');
      return;
    }

    sendJson(response, 200, { feature });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/feedback') {
    sendJson(response, 200, { feedback: listFeedback() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/feedback') {
    const body = await readJson(request);
    const message = String(body.message || '').trim();

    if (!message) {
      sendError(response, 400, 'Feedback message is required');
      return;
    }

    sendJson(response, 201, {
      feedback: createFeedback({
        author: String(body.author || 'Anonymous'),
        message,
        source: String(body.source || 'manual')
      })
    });
    return;
  }

  sendError(response, 404, 'API route not found');
}

async function serveStatic(response, pathname) {
  const normalized = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(config.frontendDir, `.${decodeURIComponent(normalized)}`);

  if (!filePath.startsWith(config.frontendDir)) {
    sendError(response, 403, 'Forbidden');
    return;
  }

  try {
    const data = await fs.promises.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream'
    });
    response.end(data);
  } catch {
    const index = await fs.promises.readFile(path.join(config.frontendDir, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(index);
  }
}
