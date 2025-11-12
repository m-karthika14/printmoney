import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

let cached: Socket | null = null;

export function connectSocket(shopId: string): Socket {
  if (cached && cached.connected) return cached;
  // Pass shopId as query so server can join the right room
  cached = io(API_BASE, { transports: ['websocket'], query: { shopId } });
  return cached;
}

export function disconnectSocket() {
  try { cached?.disconnect(); } catch {}
  cached = null;
}

export type LiveCounts = { pending: number; printing: number; completed: number };
