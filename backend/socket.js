const { Server } = require('socket.io');
let io;

function initSocket(server, allowedOrigins = []) {
  const originAllowed = (origin) => {
    if (!origin) return true;
    for (const pattern of allowedOrigins) {
      if (pattern === '*') return true;
      if (pattern === origin) return true;
      if (pattern?.startsWith('*.')) {
        const suffix = pattern.slice(1);
        if (origin.endsWith(suffix)) return true;
      }
    }
    return false;
  };

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (originAllowed(origin)) return callback(null, true);
        return callback(new Error('Not allowed by Socket.IO CORS'));
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    const sid = socket.handshake.query?.shopId;
    if (sid) socket.join(`shop:${sid}`);
    socket.on('join', (shopId) => {
      if (shopId) socket.join(`shop:${shopId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIO };
