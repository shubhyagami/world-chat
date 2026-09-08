/**
 * ChatManager - Real-time text & rich multimedia messaging
 * Supports Image Uploads, Emojis, and Curated Animated Meme GIFs
 * Manages Public Earth Room & 1-on-1 Direct Messaging with Lightbox Zoom
 */

const CURATED_MEMES = [
  // Top Internet Memes
  { id: 'CAYVZA5NRb529kKQUc', name: 'Gigachad', category: 'memes', tags: ['gigachad', 'chad', 'cool', 'smile'] },
  { id: 'Lq0h93752f6J9tijrh', name: 'Cat Vibing', category: 'memes', tags: ['cat', 'vibing', 'jam', 'music', 'head'] },
  { id: '10JhviFuU2gWD6', name: 'Pop Cat', category: 'memes', tags: ['cat', 'pop', 'mouth', 'cute'] },
  { id: 'oF5oUYTOhvFnO', name: 'Doge', category: 'memes', tags: ['doge', 'dog', 'shiba', 'wow'] },
  { id: 'QMHoU66sBXCAU', name: 'This Is Fine', category: 'memes', tags: ['this is fine', 'dog', 'fire', 'coffee', 'burn'] },
  { id: '26ufdipQqU2lhNA4g', name: 'Mind Blown', category: 'memes', tags: ['mind blown', 'galaxy', 'brain', 'explosion', 'space'] },
  { id: 'G6sJqVUPAT75C', name: 'DiCaprio Cheers', category: 'memes', tags: ['dicaprio', 'cheers', 'gatsby', 'toast', 'drink'] },
  { id: 'B37cYPCruqjK', name: 'Confused Math', category: 'memes', tags: ['confused', 'math', 'lady', 'numbers'] },
  { id: 'a5viI92PAF89q', name: 'Confused Travolta', category: 'memes', tags: ['travolta', 'confused', 'where', 'pulp'] },
  { id: 'Ju7l5y9osyymQ', name: 'Rickroll', category: 'memes', tags: ['rickroll', 'rick astley', 'dance', 'never gonna give you up'] },
  { id: 'unQ3IJU2RG7DO', name: 'SpongeBob Rainbow', category: 'memes', tags: ['spongebob', 'rainbow', 'imagination'] },
  { id: '3oEduOnl5IHM5Zy5ZS', name: 'Homer In Bush', category: 'memes', tags: ['homer', 'simpson', 'bush', 'hide', 'bye'] },
  { id: 'xT9IgG50Fb7Mi0prBC', name: 'Success Kid', category: 'memes', tags: ['success', 'kid', 'win', 'yes'] },
  { id: 'blSTtZehjAZ8I', name: 'Keyboard Cat', category: 'memes', tags: ['cat', 'keyboard', 'play', 'piano'] },
  { id: 'artj92V8o75VPL7AeQ', name: 'Drake Hotline', category: 'memes', tags: ['drake', 'hotline', 'no', 'yes', 'dance'] },
  { id: 'xUOxfjsW9fWPqGR21O', name: 'Popcorn Chill', category: 'memes', tags: ['popcorn', 'chill', 'eat', 'movie'] },
  // Cosmic & Space Memes
  { id: '13HgwGsXF0aiGY', name: 'Dancing Astronaut', category: 'cosmic', tags: ['astronaut', 'dance', 'space', 'moon'] },
  { id: '3o7TKTDnU76u2EPjP2', name: 'Space Warp', category: 'cosmic', tags: ['warp', 'hyperspace', 'speed', 'stars'] },
  { id: '3o7abAHdTXmg0BQCY8', name: 'Earth Orbit', category: 'cosmic', tags: ['earth', 'globe', 'orbit', 'planet'] },
  { id: '3o7abKhOpu0NwenH3O', name: 'Dancing Alien', category: 'cosmic', tags: ['alien', 'dance', 'green', 'ufo'] },
  // Love & Romance Memes
  { id: 'KxUg5a17684lP9c16O', name: 'Heart Eyes', category: 'love', tags: ['heart', 'love', 'eyes', 'crush'] },
  { id: 'MDJ9IbxxvDUQM', name: 'Cat Kiss', category: 'love', tags: ['cat', 'kiss', 'love', 'cute'] },
  { id: 'l3vR85CXJux6SkSxG', name: 'Cupid Arrow', category: 'love', tags: ['cupid', 'arrow', 'love', 'heart'] }
];

const EMOJIS = {
  memes: ['😂', '🤣', '💀', '🗿', '🤡', '🐸', '🙈', '🫡', '🤪', '🥳', '🤓', '🧐', '🤯', '🙃', '😎', '🫠', '👀', '🍿', '💩', '🤷‍♂️', '🤷‍♀️', '🤦‍♂️', '👌', '🤙'],
  cosmic: ['🚀', '🛰️', '🛸', '🌍', '🌎', '🌏', '🌌', '🌠', '✨', '⭐', '🪐', '☄️', '🌙', '🌕', '☀️', '👽', '👾', '🤖', '🔭', '📡', '⚡', '🌐', '🧭', '🛸'],
  love: ['❤️', '💖', '💘', '💝', '💓', '💞', '💌', '💋', '🥰', '😍', '😘', '🌹', '🧜‍♀️', '🏹', '👰', '💐', '💍', '😻', '🏩', '💕', '❣️', '💗', '🫶', '✨'],
  vibes: ['🔥', '💯', '⚡', '🎉', '👏', '👍', '💪', '🦾', '🎯', '🏆', '🥇', '🥂', '🍻', '🍾', '🕺', '💃', '🎶', '🎵', '🎸', '🕹️', '👑', '💎', '🌈', '🔮']
};

class ChatManager {
  constructor(options = {}) {
    this.currentUser = options.currentUser;
    this.wsClient = options.wsClient;
    this.activeChannel = 'GLOBAL'; // 'GLOBAL' or target user ID
    this.targetUser = null; // null for global, or User object for direct chat
    this.messages = {
      GLOBAL: []
    };

    this.stagedMedia = null; // { url, type: 'IMAGE'|'GIF', name }

    // Core DOM Elements
    this.drawerEl = document.getElementById('chat-drawer');
    this.messagesContainer = document.getElementById('chat-messages-container');
    this.inputField = document.getElementById('chat-input-field');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.targetNameEl = document.getElementById('chat-target-name');
    this.targetSubEl = document.getElementById('chat-target-sub');
    this.targetAvatarEl = document.getElementById('chat-target-avatar');
    this.tabGlobalBtn = document.getElementById('chat-tab-global');
    this.tabDirectBtn = document.getElementById('chat-tab-direct');

    // Rich Media DOM Elements
    this.btnImg = document.getElementById('chat-img-btn');
    this.btnEmoji = document.getElementById('chat-emoji-btn');
    this.btnGif = document.getElementById('chat-gif-btn');
    this.fileInput = document.getElementById('chat-file-input');

    this.previewBar = document.getElementById('chat-media-preview-bar');
    this.previewImg = document.getElementById('chat-preview-img');
    this.previewType = document.getElementById('chat-preview-type');
    this.previewName = document.getElementById('chat-preview-name');
    this.previewRemoveBtn = document.getElementById('chat-preview-remove-btn');

    this.emojiPopover = document.getElementById('chat-emoji-popover');
    this.emojiGrid = document.getElementById('emoji-grid');
    this.emojiCloseBtn = document.getElementById('emoji-close-btn');

    this.gifPopover = document.getElementById('chat-gif-popover');
    this.gifGrid = document.getElementById('gif-grid');
    this.gifSearchInput = document.getElementById('gif-search-input');
    this.gifCloseBtn = document.getElementById('gif-close-btn');

    // Lightbox DOM Elements
    this.lightboxModal = document.getElementById('image-lightbox-modal');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxCaption = document.getElementById('lightbox-caption');
    this.lightboxCloseBtn = document.getElementById('lightbox-close-btn');

    this.audioCtx = null;
    this.initEventListeners();
    this.initEmojiPicker();
    this.initGifPicker();
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

    // Image / File Upload
    this.btnImg.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.handleFileSelected(file);
      this.fileInput.value = '';
    });

    // Staged media remove
    this.previewRemoveBtn.addEventListener('click', () => {
      this.clearStagedMedia();
    });

    // Toggle Emoji Popover
    this.btnEmoji.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = this.emojiPopover.style.display === 'flex';
      this.closeAllPopovers();
      if (!isOpen) {
        this.emojiPopover.style.display = 'flex';
      }
    });

    this.emojiCloseBtn.addEventListener('click', () => {
      this.emojiPopover.style.display = 'none';
    });

    // Toggle GIF Popover
    this.btnGif.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = this.gifPopover.style.display === 'flex';
      this.closeAllPopovers();
      if (!isOpen) {
        this.gifPopover.style.display = 'flex';
        this.gifSearchInput.value = '';
        this.renderGifGrid();
        this.gifSearchInput.focus();
      }
    });

    this.gifCloseBtn.addEventListener('click', () => {
      this.gifPopover.style.display = 'none';
    });

    this.gifSearchInput.addEventListener('input', () => {
      this.renderGifGrid(this.gifSearchInput.value.trim());
    });

    // Close popovers on click outside
    document.addEventListener('click', (e) => {
      if (this.emojiPopover && !this.emojiPopover.contains(e.target) && e.target !== this.btnEmoji) {
        this.emojiPopover.style.display = 'none';
      }
      if (this.gifPopover && !this.gifPopover.contains(e.target) && e.target !== this.btnGif) {
        this.gifPopover.style.display = 'none';
      }
    });

    // Lightbox modal close
    if (this.lightboxCloseBtn) {
      this.lightboxCloseBtn.addEventListener('click', () => {
        this.closeLightbox();
      });
    }

    if (this.lightboxModal) {
      this.lightboxModal.addEventListener('click', (e) => {
        if (e.target === this.lightboxModal) {
          this.closeLightbox();
        }
      });
    }
  }

  closeAllPopovers() {
    if (this.emojiPopover) this.emojiPopover.style.display = 'none';
    if (this.gifPopover) this.gifPopover.style.display = 'none';
  }

  /* ==========================================================================
     Emoji Picker Methods
     ========================================================================== */
  initEmojiPicker() {
    const tabs = this.emojiPopover.querySelectorAll('.emoji-cat-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.dataset.cat;
        this.renderEmojiGrid(cat);
      });
    });
    this.renderEmojiGrid('memes');
  }

  renderEmojiGrid(category = 'memes') {
    this.emojiGrid.innerHTML = '';
    const emojis = EMOJIS[category] || EMOJIS.memes;
    emojis.forEach(emo => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-item-btn';
      btn.textContent = emo;
      btn.title = emo;
      btn.addEventListener('click', () => {
        this.insertEmoji(emo);
      });
      this.emojiGrid.appendChild(btn);
    });
  }

  insertEmoji(emoji) {
    this.inputField.value += emoji;
    this.inputField.focus();
    this.playTone(880, 0.04);
  }

  /* ==========================================================================
     Meme GIF Picker Methods
     ========================================================================== */
  initGifPicker() {
    this.renderGifGrid();
  }

  renderGifGrid(query = '') {
    this.gifGrid.innerHTML = '';
    const q = (query || '').toLowerCase();
    const filtered = CURATED_MEMES.filter(m => {
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.tags.some(t => t.includes(q));
    });

    if (filtered.length === 0) {
      // Check if user entered a custom image/gif URL!
      if (q.startsWith('http://') || q.startsWith('https://')) {
        const customCard = document.createElement('div');
        customCard.className = 'gif-card custom-url-card';
        customCard.innerHTML = `
          <img src="${query}" alt="Custom GIF/Image" onerror="this.src='/images/cupid.jpg'">
          <div class="gif-card-name">Use custom media URL</div>
        `;
        customCard.addEventListener('click', () => {
          this.sendMediaMessage(query, 'GIF', 'Custom Meme GIF');
          this.closeAllPopovers();
        });
        this.gifGrid.appendChild(customCard);
        return;
      }
      this.gifGrid.innerHTML = '<div class="gif-empty-msg">No memes found. Try "cat", "doge", "dance", or paste any image/gif URL!</div>';
      return;
    }

    filtered.forEach(meme => {
      const gifUrl = `https://i.giphy.com/${meme.id}.gif`;
      const card = document.createElement('div');
      card.className = 'gif-card';
      card.title = `Send ${meme.name} meme`;
      card.innerHTML = `
        <div class="gif-card-img-wrap">
          <img src="${gifUrl}" alt="${meme.name}" loading="lazy">
        </div>
        <div class="gif-card-name">${meme.name}</div>
      `;
      card.addEventListener('click', () => {
        this.sendMediaMessage(gifUrl, 'GIF', meme.name);
        this.closeAllPopovers();
      });
      this.gifGrid.appendChild(card);
    });
  }

  /* ==========================================================================
     File Upload & Compression Methods
     ========================================================================== */
  handleFileSelected(file) {
    const isGif = file.type === 'image/gif';

    if (isGif) {
      // Keep GIF animation intact
      const reader = new FileReader();
      reader.onload = (e) => {
        this.stageMedia(e.target.result, 'GIF', file.name);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Normal photos (JPEG / PNG / WebP) - compress with canvas for instant transmission
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * maxDim / width);
            width = maxDim;
          } else {
            width = Math.round(width * maxDim / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        this.stageMedia(compressedDataUrl, 'IMAGE', file.name);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  stageMedia(url, type, name) {
    this.stagedMedia = { url, type, name };
    this.previewImg.src = url;
    this.previewType.textContent = type === 'GIF' ? 'GIF MEME' : 'PHOTO';
    this.previewName.textContent = name || 'Ready to transmit';
    this.previewBar.style.display = 'flex';
    this.inputField.placeholder = 'Add an optional caption and press enter...';
    this.inputField.focus();
  }

  clearStagedMedia() {
    this.stagedMedia = null;
    this.previewBar.style.display = 'none';
    this.previewImg.src = '';
    this.inputField.placeholder = 'Type a message, emoji or meme...';
  }

  /* ==========================================================================
     Lightbox Zoom Modal
     ========================================================================== */
  openLightbox(url, caption = '') {
    if (!this.lightboxModal) return;
    this.lightboxImg.src = url;
    this.lightboxCaption.textContent = caption;
    this.lightboxModal.style.display = 'flex';
  }

  closeLightbox() {
    if (!this.lightboxModal) return;
    this.lightboxModal.style.display = 'none';
    this.lightboxImg.src = '';
  }

  /* ==========================================================================
     Sending Messages (Text, Images, Meme GIFs)
     ========================================================================== */
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
    this.closeAllPopovers();
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

  sendMediaMessage(mediaUrl, mediaType, defaultCaption = '') {
    if (!this.wsClient || !this.currentUser) return;
    const text = this.inputField.value.trim();

    const payload = {
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      targetId: this.activeChannel === 'GLOBAL' ? 'GLOBAL' : this.activeChannel,
      content: text || defaultCaption,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      type: mediaType,
      timestamp: Date.now()
    };

    this.wsClient.sendMessage(payload);
    this.inputField.value = '';
    this.clearStagedMedia();
    this.playTone(620, 0.08);
  }

  sendMessage() {
    if (!this.wsClient || !this.currentUser) return;

    // Check if there is staged media to send
    if (this.stagedMedia) {
      this.sendMediaMessage(this.stagedMedia.url, this.stagedMedia.type, this.inputField.value.trim());
      return;
    }

    let text = this.inputField.value.trim();
    if (!text) return;

    // Check if the user pasted a direct image/gif link
    const isUrl = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(text);
    const isGiphyUrl = /^https?:\/\/.*giphy\.com\/.*/i.test(text);
    const isTenorUrl = /^https?:\/\/.*tenor\.com\/.*/i.test(text);

    let mediaUrl = null;
    let mediaType = 'TEXT';

    if (isUrl || isGiphyUrl || isTenorUrl) {
      mediaUrl = text;
      mediaType = text.toLowerCase().includes('.gif') ? 'GIF' : 'IMAGE';
    }

    const messagePayload = {
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      targetId: this.activeChannel === 'GLOBAL' ? 'GLOBAL' : this.activeChannel,
      content: text,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
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
      // Show unread alert or notification
      if (!isGlobal && msg.senderId !== this.currentUser.id) {
        const preview = msg.mediaUrl ? (msg.mediaType === 'GIF' ? '🎭 Meme GIF' : '🖼️ Image') : msg.content;
        window.showToast?.(`💬 New message from ${msg.senderName}: "${preview}"`);
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

    // 1. Render Media (Image or Meme GIF)
    const mediaUrl = msg.mediaUrl || (msg.content && (msg.content.startsWith('data:image/') || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(msg.content) ? msg.content : null));

    if (mediaUrl) {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'chat-bubble-media';

      const img = document.createElement('img');
      img.src = mediaUrl;
      img.alt = msg.mediaType === 'GIF' ? 'Meme GIF' : 'Chat Image';
      img.loading = 'lazy';
      img.title = 'Click to zoom';

      img.addEventListener('click', () => {
        this.openLightbox(mediaUrl, msg.content !== mediaUrl ? msg.content : '');
      });

      mediaWrap.appendChild(img);
      content.appendChild(mediaWrap);
    }

    // 2. Render Text Content / Caption
    const hasText = msg.content && msg.content !== mediaUrl;
    if (hasText) {
      const textEl = document.createElement('div');
      textEl.className = 'chat-bubble-text';

      // Check for standalone emoji message
      const emojiOnlyRegex = /^(\p{Extended_Pictographic}|\s)+$/u;
      if (!mediaUrl && emojiOnlyRegex.test(msg.content.trim()) && msg.content.trim().length <= 8) {
        textEl.classList.add('jumbo-emoji');
      }

      textEl.textContent = msg.content;
      content.appendChild(textEl);
    }

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
    } catch (e) {}
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
