/**
 * WebRTCCallManager - Peer-to-Peer Audio & Video Calling
 * Handles WebRTC peer connection, media streams, screen sharing, ringing tones, and STOMP signaling
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

class WebRTCCallManager {
  constructor(options = {}) {
    this.currentUser = options.currentUser;
    this.wsClient = options.wsClient;

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerUser = null;
    this.isCaller = false;
    this.callActive = false;

    this.audioEnabled = true;
    this.videoEnabled = true;
    this.isScreenSharing = false;

    this.callTimerInterval = null;
    this.callStartTime = 0;
    this.ringtoneInterval = null;
    this.audioCtx = null;

    // DOM Elements
    this.callModal = document.getElementById('video-call-modal');
    this.incomingModal = document.getElementById('incoming-call-modal');
    this.localVideo = document.getElementById('local-video');
    this.remoteVideo = document.getElementById('remote-video');
    this.remotePlaceholder = document.getElementById('remote-placeholder');

    this.peerNameEl = document.getElementById('call-peer-name');
    this.callTimerEl = document.getElementById('call-timer');

    this.btnMuteAudio = document.getElementById('btn-mute-audio');
    this.btnToggleVideo = document.getElementById('btn-toggle-video');
    this.btnScreenShare = document.getElementById('btn-screen-share');
    this.btnEndCall = document.getElementById('btn-end-call');

    this.incomingAvatar = document.getElementById('incoming-caller-avatar');
    this.incomingName = document.getElementById('incoming-caller-name');
    this.incomingLocation = document.getElementById('incoming-caller-location');
    this.btnAcceptCall = document.getElementById('btn-accept-call');
    this.btnRejectCall = document.getElementById('btn-reject-call');

    this.initEventListeners();
  }

  initEventListeners() {
    this.btnEndCall.addEventListener('click', () => this.endCall());

    this.btnMuteAudio.addEventListener('click', () => this.toggleAudio());
    this.btnToggleVideo.addEventListener('click', () => this.toggleVideo());
    this.btnScreenShare.addEventListener('click', () => this.toggleScreenShare());

    this.btnAcceptCall.addEventListener('click', () => this.acceptIncomingCall());
    this.btnRejectCall.addEventListener('click', () => this.rejectIncomingCall());
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  setWsClient(wsClient) {
    this.wsClient = wsClient;
  }

  /**
   * Caller initiates call to targetUser
   */
  async startCall(targetUser) {
    if (this.callActive) {
      window.showToast?.('You are already in a call.');
      return;
    }

    this.isCaller = true;
    this.peerUser = targetUser;

    try {
      await this.getMedia();
      this.openModal();
      this.peerNameEl.textContent = `Calling ${targetUser.name}...`;
      this.callTimerEl.textContent = 'Dialing';

      // Send call request to peer
      this.wsClient.sendSignal({
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        senderAvatar: this.currentUser.avatarUrl,
        targetId: targetUser.id,
        type: 'call-request',
        payload: {
          city: this.currentUser.city,
          country: this.currentUser.country
        }
      });

      this.startOutgoingRingtone();
    } catch (err) {
      console.error('Failed to get user media for call:', err);
      window.showToast?.('Camera/Microphone access was denied or unavailable.');
      this.endCall(false);
    }
  }

  /**
   * Callee receives incoming call alert
   */
  handleIncomingCallRequest(signal) {
    if (this.callActive) {
      // Busy: reject automatically
      this.wsClient.sendSignal({
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        targetId: signal.senderId,
        type: 'call-reject',
        payload: { reason: 'busy' }
      });
      return;
    }

    this.pendingCallSignal = signal;
    this.peerUser = {
      id: signal.senderId,
      name: signal.senderName,
      avatarUrl: signal.senderAvatar,
      city: signal.payload?.city || 'Globe',
      country: signal.payload?.country || ''
    };

    this.incomingName.textContent = signal.senderName;
    this.incomingLocation.textContent = `${this.peerUser.city}, ${this.peerUser.country}`;
    this.incomingAvatar.src = signal.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(signal.senderName);

    this.incomingModal.classList.add('open');
    this.startIncomingRingtone();
  }

  /**
   * Callee accepts call
   */
  async acceptIncomingCall() {
    this.stopRingtone();
    this.incomingModal.classList.remove('open');

    if (!this.pendingCallSignal) return;

    this.isCaller = false;
    try {
      await this.getMedia();
      this.openModal();
      this.peerNameEl.textContent = this.peerUser.name;
      this.callTimerEl.textContent = 'Connecting...';

      this.createPeerConnection();

      // Notify caller that call was accepted
      this.wsClient.sendSignal({
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        senderAvatar: this.currentUser.avatarUrl,
        targetId: this.peerUser.id,
        type: 'call-accept',
        payload: {}
      });
    } catch (err) {
      console.error('Failed to acquire media on accept:', err);
      window.showToast?.('Microphone/Camera permission required to join call.');
      this.rejectIncomingCall();
    }
  }

  /**
   * Callee rejects call
   */
  rejectIncomingCall() {
    this.stopRingtone();
    this.incomingModal.classList.remove('open');
    if (this.pendingCallSignal) {
      this.wsClient.sendSignal({
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        targetId: this.pendingCallSignal.senderId,
        type: 'call-reject',
        payload: { reason: 'declined' }
      });
      this.pendingCallSignal = null;
    }
  }

  /**
   * Route incoming WebRTC signals
   */
  async handleSignalMessage(signal) {
    const { type, payload, senderId } = signal;

    switch (type) {
      case 'call-request':
        this.handleIncomingCallRequest(signal);
        break;

      case 'call-accept':
        if (this.isCaller) {
          this.stopRingtone();
          this.peerNameEl.textContent = this.peerUser.name;
          this.callTimerEl.textContent = 'Connecting...';
          // Create peer connection & send SDP Offer
          this.createPeerConnection();
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);

          this.wsClient.sendSignal({
            senderId: this.currentUser.id,
            targetId: this.peerUser.id,
            type: 'offer',
            payload: offer
          });
        }
        break;

      case 'call-reject':
        this.stopRingtone();
        window.showToast?.(`${this.peerUser?.name || 'User'} declined or is busy.`);
        this.endCall(false);
        break;

      case 'offer':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          this.wsClient.sendSignal({
            senderId: this.currentUser.id,
            targetId: senderId,
            type: 'answer',
            payload: answer
          });
        }
        break;

      case 'answer':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
        }
        break;

      case 'ice-candidate':
        if (this.peerConnection && payload) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        }
        break;

      case 'hangup':
        window.showToast?.('Call ended by remote user.');
        this.endCall(false);
        break;
    }
  }

  /**
   * Acquire local camera & microphone stream
   */
  async getMedia() {
    if (this.localStream) {
      return this.localStream;
    }
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
      audio: true
    });
    this.localVideo.srcObject = this.localStream;
    return this.localStream;
  }

  /**
   * Initialize RTCPeerConnection and attach tracks
   */
  createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.peerUser) {
        this.wsClient.sendSignal({
          senderId: this.currentUser.id,
          targetId: this.peerUser.id,
          type: 'ice-candidate',
          payload: event.candidate
        });
      }
    };

    // Remote track arrived
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.remoteVideo.srcObject = this.remoteStream;
      this.remotePlaceholder.style.display = 'none';
      this.remoteVideo.style.display = 'block';

      if (!this.callActive) {
        this.callActive = true;
        this.startCallTimer();
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === 'disconnected' ||
          this.peerConnection.connectionState === 'failed') {
        this.endCall(false);
      }
    };
  }

  /**
   * End or hang up call
   */
  endCall(notifyPeer = true) {
    this.stopRingtone();
    this.stopCallTimer();

    if (notifyPeer && this.peerUser && this.wsClient) {
      this.wsClient.sendSignal({
        senderId: this.currentUser.id,
        targetId: this.peerUser.id,
        type: 'hangup',
        payload: {}
      });
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.localVideo.srcObject = null;
    this.remoteVideo.srcObject = null;
    this.remoteVideo.style.display = 'none';
    this.remotePlaceholder.style.display = 'flex';

    this.callActive = false;
    this.isCaller = false;
    this.peerUser = null;
    this.isScreenSharing = false;

    this.closeModal();
    this.incomingModal.classList.remove('open');
  }

  openModal() {
    this.callModal.classList.add('open');
  }

  closeModal() {
    this.callModal.classList.remove('open');
  }

  toggleAudio() {
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      this.audioEnabled = !this.audioEnabled;
      audioTrack.enabled = this.audioEnabled;
      this.btnMuteAudio.classList.toggle('off', !this.audioEnabled);
    }
  }

  toggleVideo() {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      this.videoEnabled = !this.videoEnabled;
      videoTrack.enabled = this.videoEnabled;
      this.btnToggleVideo.classList.toggle('off', !this.videoEnabled);
    }
  }

  async toggleScreenShare() {
    if (!this.peerConnection) return;

    if (!this.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        this.localVideo.srcObject = screenStream;
        this.isScreenSharing = true;
        this.btnScreenShare.classList.add('active');

        screenTrack.onended = () => {
          this.revertToCamera();
        };
      } catch (e) {
        console.warn('Screen share cancelled:', e);
      }
    } else {
      this.revertToCamera();
    }
  }

  async revertToCamera() {
    if (!this.localStream) return;
    const camTrack = this.localStream.getVideoTracks()[0];
    const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender && camTrack) {
      sender.replaceTrack(camTrack);
    }
    this.localVideo.srcObject = this.localStream;
    this.isScreenSharing = false;
    this.btnScreenShare.classList.remove('active');
  }

  startCallTimer() {
    this.callStartTime = Date.now();
    this.callTimerInterval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - this.callStartTime) / 1000);
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      this.callTimerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  stopCallTimer() {
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
    }
  }

  /**
   * Sound synthesis for Incoming & Outgoing rings
   */
  startIncomingRingtone() {
    this.stopRingtone();
    this.ringtoneInterval = setInterval(() => {
      this.playDualTone(440, 480, 0.7);
    }, 2500);
    this.playDualTone(440, 480, 0.7);
  }

  startOutgoingRingtone() {
    this.stopRingtone();
    this.ringtoneInterval = setInterval(() => {
      this.playDualTone(440, 480, 1.2);
    }, 3500);
    this.playDualTone(440, 480, 1.2);
  }

  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  playDualTone(f1, f2, dur) {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.frequency.value = f1;
      osc2.frequency.value = f2;

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(this.audioCtx.currentTime + dur);
      osc2.stop(this.audioCtx.currentTime + dur);
    } catch (e) {}
  }
}

window.WebRTCCallManager = WebRTCCallManager;
