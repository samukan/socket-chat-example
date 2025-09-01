/* Client-side logic for rooms + usernames */
(function () {
  const socket = io();

  const els = {
    username: document.getElementById('username'),
    roomInput: document.getElementById('room'),
    changeRoomBtn: document.getElementById('changeRoomBtn'),
    currentRoom: document.getElementById('currentRoom'),
    messages: document.getElementById('messages'),
    form: document.getElementById('composer'),
    messageInput: document.getElementById('messageInput'),
  };

  function appendMessage(content, opts = {}) {
    const li = document.createElement('li');
    if (opts.system) li.classList.add('system');
    li.innerHTML = content;
    els.messages.appendChild(li);
    window.scrollTo(0, document.body.scrollHeight);
  }

  function sanitize(str, max) {
    return String(str || '')
      .trim()
      .slice(0, max || 100);
  }

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = sanitize(els.messageInput.value, 500);
    if (!message) return;
    const username = sanitize(els.username.value, 30) || 'Anonymous';
    const room =
      sanitize(els.currentRoom.dataset.room || 'general', 30) || 'general';
    socket.emit('chat message', { username, message, room });
    els.messageInput.value = '';
  });

  els.changeRoomBtn.addEventListener('click', () => {
    const requested = sanitize(els.roomInput.value, 30) || 'general';
    socket.emit('join room', requested);
  });

  socket.on('room joined', (room) => {
    els.currentRoom.textContent = '#' + room;
    els.currentRoom.dataset.room = room;
    // Clear messages for new room context
    els.messages.innerHTML = '';
    appendMessage('Joined room #' + room, { system: true });
  });

  socket.on('system message', (msg) => {
    appendMessage(msg, { system: true });
  });

  socket.on('chat message', (payload) => {
    // payload: { room, username, message }
    if (!payload || typeof payload !== 'object') return;
    const room = payload.room;
    // Only show messages for the current room (server already filters, safeguard for multi-room future)
    if (room !== (els.currentRoom.dataset.room || 'general')) return;
    const usernameEsc = sanitize(payload.username, 30) || 'Anonymous';
    const msgEsc = sanitize(payload.message, 500);
    if (!msgEsc) return;
    appendMessage(
      '<strong>' +
        usernameEsc.replace(/</g, '&lt;') +
        '</strong> ' +
        msgEsc.replace(/</g, '&lt;')
    );
  });

  // Initial defaults
  els.currentRoom.dataset.room = 'general';
})();
