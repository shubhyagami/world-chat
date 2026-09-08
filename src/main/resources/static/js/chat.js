/**
 * ChatManager - Real-time text messaging with sound alerts
 * Manages Public Earth Room & 1-on-1 Direct Messaging
 */

class ChatManager {
  constructor(options = {}) {
    this.currentUser = options.currentUser;
    this.wsClient = options.wsClient;
    this.activeChannel = 'GLOBAL'; // 'GLOBAL' or target user ID
    this.targetUser = null; // null for global, or User object for direct chat
    this.messages = {
      GLOBAL: []
    };

    this.drawerEl = document.getElementById('chat-drawer');
    this.messagesContainer = document.getElementById('chat-messages-container');
    this.inputField = document.getElementById('chat-input-field');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.targetNameEl = document.getElementById('chat-target-name');
    this.targetSubEl = document.getElementById('chat-target-sub');
    this.targetAvatarEl = document.getElementById('chat-target-avatar');
    this.tabGlobalBtn = document.getElementById('chat-tab-global');
    this.tabDirectBtn = document.getElementById('chat-tab-direct');

    this.audioCtx = null;
    this.initEventListeners();
  }

  initEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    document.getElementById('chat-close-btn').addEventListener('click', () => {
      this.close();
    });

    this.tabGlobalBtn.addEventListener('click', () => {
      this.setChannel('GLOBAL');
    });

    this.tabDirectBtn.addEventListener('click', () => {
      if (this.targetUser) {
        this.setChannel(this.targetUser.id, this.targetUser);
      }
    });
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  setWsClient(wsClient) {
    this.wsClient = wsClient;
  }

  openWithUser(targetUser) {
    this.targetUser = targetUser;
    this.tabDirectBtn.style.display = 'block';
    this.tabDirectBtn.textContent = `DM: ${targetUser.name}`;
    this.setChannel(targetUser.id, targetUser);
    this.open();
  }

  openGlobal() {
    this.setChannel('GLOBAL');
    this.open();
  }

  open() {
    this.drawerEl.classList.add('open');
    this.inputField.focus();
  }

  close() {
    this.drawerEl.classList.remove('open');
  }

  setChannel(channelId, user = null) {
    this.activeChannel = channelId;
    if (!this.messages[channelId]) {
      this.messages[channelId] = [];
    }

    if (channelId === 'GLOBAL') {
      this.tabGlobalBtn.classList.add('active');
      this.tabDirectBtn.classList.remove('active');
      this.targetNameEl.textContent = 'Global Earth Chat';
      this.targetSubEl.textContent = 'Broadcast to all active users';
      this.targetAvatarEl.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=GlobalEarth';
    } else if (user) {
      this.targetUser = user;
      this.tabGlobalBtn.classList.remove('active');
      this.tabDirectBtn.classList.add('active');
      this.targetNameEl.textContent = user.name;
      this.targetSubEl.textContent = `${user.city || 'Online'} • Direct Encrypted`;
      this.targetAvatarEl.src = user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(user.name);
    }

    this.renderMessages();
  }

  sendMessage() {
    const text = this.inputField.value.trim();
    if (!text || !this.wsClient || !this.currentUser) return;

    const messagePayload = {
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      targetId: this.activeChannel === 'GLOBAL' ? 'GLOBAL' : this.activeChannel,
      content: text,
      type: this.activeChannel === 'GLOBAL' ? 'GLOBAL' : 'CHAT',
      timestamp: Date.now()
    };

    this.wsClient.sendMessage(messagePayload);
    this.inputField.value = '';
    this.playTone(600, 0.06);
  }

  handleIncomingMessage(msg) {
    const isGlobal = !msg.targetId || msg.targetId === 'GLOBAL';
    const channelKey = isGlobal ? 'GLOBAL' : (msg.senderId === this.currentUser.id ? msg.targetId : msg.senderId);

    if (!this.messages[channelKey]) {
      this.messages[channelKey] = [];
    }
    this.messages[channelKey].push(msg);

    // If viewing this channel, render it
    if (this.activeChannel === channelKey) {
      this.appendMessageElement(msg);
      this.scrollToBottom();
    } else {
      // Show unread alert or auto open if direct
      if (!isGlobal && msg.senderId !== this.currentUser.id) {
        window.showToast?.(`💬 New message from ${msg.senderName}: "${msg.content}"`);
      }
    }

    // Play incoming audio ping if received from someone else
    if (msg.senderId !== this.currentUser.id) {
      this.playChime();
    }
  }

  renderMessages() {
    this.messagesContainer.innerHTML = '';
    const currentList = this.messages[this.activeChannel] || [];
    currentList.forEach(msg => this.appendMessageElement(msg));
    this.scrollToBottom();
  }

  appendMessageElement(msg) {
    const isMe = msg.senderId === this.currentUser?.id;
    const isSystem = msg.type === 'SYSTEM';

    const bubble = document.createElement('div');
    bubble.className = `chat-message-bubble ${isSystem ? 'system' : (isMe ? 'outgoing' : 'incoming')}`;

    if (!isSystem) {
      const avatar = document.createElement('img');
      avatar.className = 'chat-bubble-avatar';
      avatar.src = msg.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(msg.senderName);
      bubble.appendChild(avatar);
    }

    const body = document.createElement('div');
    body.className = 'chat-bubble-body';

    const content = document.createElement('div');
    content.className = 'chat-bubble-content';
    content.textContent = msg.content;
    body.appendChild(content);

    if (!isSystem) {
      const meta = document.createElement('div');
      meta.className = 'chat-bubble-meta';
      const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      meta.textContent = `${isMe ? 'You' : msg.senderName} • ${timeStr}`;
      body.appendChild(meta);
    }

    bubble.appendChild(body);
    this.messagesContainer.appendChild(bubble);
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  /**
   * Synthesize audio chime using Web Audio API
   */
  playChime() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio not permitted yet
    }
  }

  playTone(freq, dur) {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + dur);
    } catch (e) {}
  }
}

window.ChatManager = ChatManager;
