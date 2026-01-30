import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { sessionMiddleware } from './app';
import { chatService } from './services/chat.service';
import type { Socket } from 'net';

const MAX_MESSAGE_LENGTH = 4000;

export function setupWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    // Only handle /ws path
    if (req.url !== '/ws') {
      socket.destroy();
      return;
    }

    // Run session middleware to populate req.session
    const res: any = { setHeader() {}, writeHead() {}, end() {} };
    sessionMiddleware(req as any, res, (err?: any) => {
      if (err) {
        socket.destroy();
        return;
      }

      const session = (req as any).session;
      if (!session?.tokens?.access_token || !session?.user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const session = (req as any).session;
    const userId: string = session.user.id;
    const accessToken: string = session.tokens.access_token;

    ws.on('message', async (raw: Buffer | string) => {
      let parsed: any;
      try {
        parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
        return;
      }

      if (parsed.type !== 'send_message') {
        ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${parsed.type}` }));
        return;
      }

      let message: string = parsed.message;
      if (!message || typeof message !== 'string') {
        ws.send(JSON.stringify({ type: 'error', error: 'message is required' }));
        return;
      }

      message = message.trim();
      if (message.length === 0) {
        ws.send(JSON.stringify({ type: 'error', error: 'message is required' }));
        return;
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        ws.send(JSON.stringify({ type: 'error', error: `message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }));
        return;
      }

      try {
        const result = await chatService.sendMessage(
          userId,
          parsed.conversationId || null,
          message,
          accessToken,
        );
        ws.send(JSON.stringify({ type: 'reply', data: result }));
      } catch (error: any) {
        ws.send(JSON.stringify({ type: 'error', error: error.message || 'Chat failed' }));
      }
    });
  });

  return wss;
}
