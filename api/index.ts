import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from '../serverApp';

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.url) {
    const parsed = new URL(req.url, 'http://localhost');
    const forwardedPath = parsed.searchParams.get('__path');
    if (forwardedPath !== null && (parsed.pathname === '/api' || parsed.pathname === '/api/')) {
      parsed.searchParams.delete('__path');
      const search = parsed.searchParams.toString();
      const normalized = forwardedPath.replace(/^\/+/, '');
      req.url = `/api/${normalized}${search ? `?${search}` : ''}`;
    }
  }
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
