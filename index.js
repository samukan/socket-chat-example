const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

function sanitizeRoom(raw) {
  return (
    String(raw || 'general')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') || 'general'
  ).slice(0, 30);
}
function sanitizeUsername(raw) {
  return (
    String(raw || 'Anonymous')
      .trim()
      .slice(0, 30) || 'Anonymous'
  );
}
function sanitizeMessage(raw) {
  return String(raw || '')
    .trim()
    .slice(0, 500);
}

io.on('connection', (socket) => {
  socket.data.room = 'general';
  socket.join(socket.data.room);
  socket.emit('system message', `Joined room #${socket.data.room}`);

  socket.on('join room', (roomRequested) => {
    const newRoom = sanitizeRoom(roomRequested);
    if (!newRoom) return;
    const oldRoom = socket.data.room;
    if (oldRoom === newRoom) return;
    socket.leave(oldRoom);
    socket.join(newRoom);
    socket.data.room = newRoom;
    socket.emit('room joined', newRoom);
    socket.to(oldRoom).emit('system message', `A user left room #${oldRoom}`);
    io.to(newRoom).emit('system message', `A user joined room #${newRoom}`);
  });

  socket.on('chat message', (payload) => {
    if (typeof payload === 'string') {
      const message = sanitizeMessage(payload);
      if (!message) return;
      io.to(socket.data.room).emit('chat message', {
        room: socket.data.room,
        username: 'Anonymous',
        message,
      });
      return;
    }
    if (payload && typeof payload === 'object') {
      const room = sanitizeRoom(payload.room || socket.data.room);
      if (room !== socket.data.room) {
        socket.leave(socket.data.room);
        socket.join(room);
        socket.data.room = room;
        socket.emit('room joined', room);
      }
      const username = sanitizeUsername(payload.username);
      const message = sanitizeMessage(payload.message);
      if (!message) return;
      io.to(room).emit('chat message', { room, username, message });
    }
  });

  socket.on('disconnect', () => {
    socket.leave(socket.data.room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
