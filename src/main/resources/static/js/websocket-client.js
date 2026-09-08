/**
 * WebSocketClient - STOMP & SockJS client for Spring Boot backend
 * Manages user registration, real-time sync of users and 3D links, chat messages, and WebRTC signals
 */

class WebSocketClient {
  constructor(options = {}) {
    this.stompClient = null;
    this.connected = false;
    this.userId = null;

    this.onUsersUpdate = options.onUsersUpdate || (() => {});
    this.onLinksUpdate = options.onLinksUpdate || (() => {});
    this.onChatMessage = options.onChatMessage || (() => {});
    this.onSignalMessage = options.onSignalMessage || (() => {});
    this.onLoveEvent = options.onLoveEvent || (() => {});
    this.onConnectStatus = options.onConnectStatus || (() => {});
  }

  connect(userId, userProfile) {
    this.userId = userId;
    const socket = new SockJS('/ws');
    this.stompClient = Stomp.over(socket);
    // Disable verbose debug logging in console
    this.stompClient.debug = () => {};

    this.stompClient.connect({}, (frame) => {
      this.connected = true;
      this.onConnectStatus(true);
      console.log('Connected to OrbitSync WebSocket broker');

      // 1. Subscribe to active users broadcast
      this.stompClient.subscribe('/topic/users', (message) => {
        try {
          const users = JSON.parse(message.body);
          this.onUsersUpdate(users);
        } catch (e) {
          console.error('Failed to parse users payload:', e);
        }
      });

      // 2. Subscribe to active 3D connection links broadcast
      this.stompClient.subscribe('/topic/links', (message) => {
        try {
          const links = JSON.parse(message.body);
          this.onLinksUpdate(links);
        } catch (e) {
          console.error('Failed to parse links payload:', e);
        }
      });

      // 2.5 Subscribe to worldwide Cupid Love Events
      this.stompClient.subscribe('/topic/love-events', (message) => {
        try {
          const loveData = JSON.parse(message.body);
          this.onLoveEvent(loveData);
        } catch (e) {
          console.error('Failed to parse love-events payload:', e);
        }
      });

      // 3. Subscribe to public chat messages
      this.stompClient.subscribe('/topic/chat.public', (message) => {
        try {
          const chat = JSON.parse(message.body);
          this.onChatMessage(chat);
        } catch (e) {
          console.error('Failed to parse public chat message:', e);
        }
      });

      // 4. Subscribe to private direct chat messages for this user
      this.stompClient.subscribe(`/topic/user.${this.userId}.chat`, (message) => {
        try {
          const chat = JSON.parse(message.body);
          this.onChatMessage(chat);
        } catch (e) {
          console.error('Failed to parse private chat message:', e);
        }
      });

      // 5. Subscribe to WebRTC signaling messages for this user
      this.stompClient.subscribe(`/topic/user.${this.userId}.signal`, (message) => {
        try {
          const signal = JSON.parse(message.body);
          this.onSignalMessage(signal);
        } catch (e) {
          console.error('Failed to parse signaling message:', e);
        }
      });

      // Register initial presence and location with Spring Boot
      if (userProfile) {
        this.join(userProfile);
      }
    }, (error) => {
      this.connected = false;
      this.onConnectStatus(false);
      console.warn('WebSocket connection lost, reconnecting in 3s...', error);
      setTimeout(() => this.connect(this.userId, userProfile), 3000);
    });
  }

  join(userProfile) {
    if (this.stompClient && this.connected) {
      this.stompClient.send('/app/user.join', {}, JSON.stringify(userProfile));
    }
  }

  updateLocation(update) {
    if (this.stompClient && this.connected) {
      this.stompClient.send('/app/user.updateLocation', {}, JSON.stringify(update));
    }
  }

  sendMessage(message) {
    if (this.stompClient && this.connected) {
      this.stompClient.send('/app/chat.send', {}, JSON.stringify(message));
    }
  }

  sendSignal(signal) {
    if (this.stompClient && this.connected) {
      this.stompClient.send('/app/call.signal', {}, JSON.stringify(signal));
    }
  }

  updateProfile(profile) {
    if (this.stompClient && this.connected) {
      this.stompClient.send('/app/user.updateProfile', {}, JSON.stringify(profile));
    }
  }

  shootLove(event) {
    if (this.stompClient && this.connected) {
      this.stompClient.send('/app/love.shoot', {}, JSON.stringify(event));
    }
  }
}

window.WebSocketClient = WebSocketClient;
