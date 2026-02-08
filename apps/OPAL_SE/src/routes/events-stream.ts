/**
 * Events Stream Routes
 * 
 * SSE endpoint for real-time activity event streaming to frontend clients.
 */

import express, { Request, Response } from 'express';
import { eventBus } from '../services/eventBus';
import logger from '../logger';

const router = express.Router();

// CORS middleware for SSE
router.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

/**
 * @route GET /api/events/stream
 * @desc SSE endpoint — streams ActivityEvents in real time
 * @access Public
 */
router.get('/stream', (req: Request, res: Response) => {
  logger.info('[SSE] New event stream client connected');

  const cleanup = eventBus.addSSEClient(res);

  // Keep-alive ping every 30s to prevent proxy timeouts
  const keepAlive = setInterval(() => {
    try {
      res.write(`: keep-alive\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 30_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    cleanup();
    logger.info('[SSE] Event stream client disconnected');
  });
});

/**
 * @route GET /api/events/bus-stats
 * @desc Get event bus statistics
 * @access Public
 */
router.get('/bus-stats', (_req: Request, res: Response) => {
  res.json(eventBus.getStats());
});

export default router;
