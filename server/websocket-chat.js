// Simple WebSocket server for video call chat functionality
const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store active sessions and their participants
const activeSessions = new Map();

wss.on('connection', (ws, req) => {
  const pathname = url.parse(req.url).pathname;
  const sessionId = pathname.split('/').pop();
  
  if (!sessionId || sessionId === 'chat') {
    console.log('Invalid session ID, closing connection');
    ws.close();
    return;
  }

  console.log(`New WebSocket connection for session: ${sessionId}`);
  
  // Initialize session if it doesn't exist
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, new Set());
  }

  // Add this connection to the session
  const sessionConnections = activeSessions.get(sessionId);
  sessionConnections.add(ws);
  
  // Store session info on the WebSocket
  ws.sessionId = sessionId;
  ws.isAlive = true;

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Message received in session ${sessionId}:`, message.type);

      if (message.type === 'join') {
        ws.userId = message.userId;
        ws.userName = message.userName;
        ws.userRole = message.userRole;
        console.log(`User ${message.userName} (${message.userRole}) joined session ${sessionId}`);
        
        // Notify others in the session about the join
        broadcastToSession(sessionId, {
          type: 'user_joined',
          userId: message.userId,
          userName: message.userName,
          userRole: message.userRole
        }, ws);
        
      } else if (message.type === 'message' && message.message) {
        console.log(`Broadcasting message in session ${sessionId} from ${ws.userName}`);
        
        // Broadcast message to all other participants in the session
        broadcastToSession(sessionId, {
          type: 'message',
          message: message.message
        }, ws);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`Connection closed for session ${sessionId}, user: ${ws.userName}`);
    
    // Remove from session
    if (sessionConnections) {
      sessionConnections.delete(ws);
      
      // Clean up empty sessions
      if (sessionConnections.size === 0) {
        activeSessions.delete(sessionId);
        console.log(`Session ${sessionId} cleaned up`);
      } else {
        // Notify others about the leave
        broadcastToSession(sessionId, {
          type: 'user_left',
          userId: ws.userId,
          userName: ws.userName,
          userRole: ws.userRole
        });
      }
    }
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for session ${sessionId}:`, error);
  });

  // Pong handler for keep-alive
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    sessionId: sessionId,
    message: 'Connected to chat server'
  }));
});

// Broadcast message to all connections in a session (except sender)
function broadcastToSession(sessionId, message, sender = null) {
  const sessionConnections = activeSessions.get(sessionId);
  if (!sessionConnections) return;

  const messageStr = JSON.stringify(message);
  
  sessionConnections.forEach((ws) => {
    if (ws !== sender && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  });
}

// Ping all connections every 30 seconds to keep them alive
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Clean up on server shutdown
wss.on('close', () => {
  clearInterval(pingInterval);
});

// Start the server
const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket chat server running on port ${PORT}`);
  console.log(`WebSocket URL: ws://localhost:${PORT}/chat/{sessionId}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('Shutting down WebSocket server...');
  clearInterval(pingInterval);
  wss.close(() => {
    server.close(() => {
      console.log('WebSocket server shutdown complete');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server...');
  clearInterval(pingInterval);
  wss.close(() => {
    server.close(() => {
      console.log('WebSocket server shutdown complete');
      process.exit(0);
    });
  });
});