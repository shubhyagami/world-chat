/**
 * WebRTCCallManager - Peer-to-Peer Audio & Video Calling
 * Handles WebRTC peer connection, media streams, screen sharing, ringing tones, and STOMP signaling
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // OpenRelay Public TURN Relay for NAT traversal across mobile carriers & firewalls
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
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
    this.iceCandidateQueue = [];

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
   * Solo Hardware / Self-Test Loopback mode
   */
  async startSelfTest() {
    if (this.callActive) {
      this.endCall(false);
    }
    this.isCaller = false;
    this.peerUser = {
      id: this.currentUser?.id || 'self',
      name: (this.currentUser?.name || 'Self') + ' (Echo Test)',
      avatarUrl: this.currentUser?.avatarUrl
    };

    try {
      await this.getMedia();
      this.openModal();
      this.peerNameEl.textContent = `Echo Loopback Test (${this.currentUser?.name || 'Self'})`;
      this.callTimerEl.textContent = 'Testing Hardware';

      // Mirror local stream into remote preview
      this.remoteStream = this.localStream;
      this.remoteVideo.srcObject = this.remoteStream;
      this.remoteVideo.muted = true; // Prevent acoustic feedback loop
      this.remotePlaceholder.style.display = 'none';
      this.remoteVideo.style.display = 'block';
      this.remoteVideo.play().catch(() => {});

      this.callActive = true;
      this.startCallTimer();
      window.showToast?.('Camera, Mic & Screen Share ready in Self-Test mode!');
    } catch (err) {
      console.error('Self-test media error:', err);
      window.showToast?.('Hardware access error during self-test.');
    }
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
   * Drain any queued ICE candidates once remoteDescription is set
   */
  async drainIceCandidateQueue() {
    while (this.iceCandidateQueue && this.iceCandidateQueue.length > 0) {
      const cand = this.iceCandidateQueue.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Error adding queued ICE candidate:', e);
      }
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

          // Create peer connection & send SDP Offer to peer
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
        if (!this.peerConnection) {
          this.createPeerConnection();
        }
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
          await this.drainIceCandidateQueue();
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          this.wsClient.sendSignal({
            senderId: this.currentUser.id,
            targetId: senderId,
            type: 'answer',
            payload: answer
          });
        } catch (err) {
          console.error('Error handling WebRTC offer:', err);
        }
        break;

      case 'answer':
        if (this.peerConnection) {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
            await this.drainIceCandidateQueue();
          } catch (err) {
            console.error('Error setting remote answer:', err);
          }
        }
        break;

      case 'ice-candidate':
        if (payload) {
          if (this.peerConnection && this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload));
            } catch (e) {
              console.warn('Error adding direct ICE candidate:', e);
            }
          } else {
            // Buffer candidate until remoteDescription is active
            this.iceCandidateQueue.push(payload);
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
   * Acquire local camera & microphone stream with robust fallback
   * 1. Try real camera + microphone
   * 2. If camera unavailable (no hardware or locked by another tab), fallback to audio + synthetic animated canvas
   * 3. If audio also unavailable, fallback to full synthetic stream (animated avatar + silent audio track)
   * GUARANTEE: Never throws or aborts the call!
   */
  async getMedia() {
    if (this.localStream) {
      return this.localStream;
    }

    let stream = null;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true
        });
      } catch (err1) {
        console.warn('Real camera acquisition failed, trying audio-only with synthetic video:', err1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
        } catch (err2) {
          console.warn('Microphone also unavailable or denied, creating complete synthetic stream:', err2);
        }
      }
    }

    if (!stream || stream.getVideoTracks().length === 0) {
      // Create synthetic animated video stream using canvas
      const synthetic = this.createSyntheticStream(this.currentUser?.name || 'Orbiter', this.currentUser?.avatarUrl);
      if (stream && stream.getAudioTracks().length > 0) {
        // Use real mic audio with synthetic video
        stream = new MediaStream([synthetic.getVideoTracks()[0], stream.getAudioTracks()[0]]);
      } else {
        stream = synthetic;
      }
    }

    this.localStream = stream;
    if (this.localVideo) {
      this.localVideo.srcObject = this.localStream;
    }
    return this.localStream;
  }

  /**
   * Create an animated Canvas video track and Web Audio tone/silent track
   */
  createSyntheticStream(userName, avatarUrl) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    avatarImg.src = avatarUrl || ('https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(userName));

    let frame = 0;
    const render = () => {
      frame++;
      // Dark futuristic gradient background
      const grad = ctx.createRadialGradient(320, 240, 40, 320, 240, 340);
      grad.addColorStop(0, '#0c1a30');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Radar scanning rings
      ctx.save();
      ctx.translate(320, 220);
      for (let i = 1; i <= 3; i++) {
        const radius = 80 + ((frame * 1.2 + i * 45) % 130);
        const alpha = Math.max(0, 1 - radius / 210);
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw avatar
      ctx.beginPath();
      ctx.arc(0, 0, 64, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      try {
        if (avatarImg.complete && avatarImg.naturalWidth > 0) {
          ctx.drawImage(avatarImg, -64, -64, 128, 128);
        } else {
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(-64, -64, 128, 128);
        }
      } catch (e) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(-64, -64, 128, 128);
      }
      ctx.restore();

      // Avatar neon border
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(320, 220, 66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // HUD text
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`📡 LIVE P2P: ${userName.toUpperCase()}`, 320, 340);

      ctx.fillStyle = '#10b981';
      ctx.font = '12px monospace';
      ctx.fillText('● SECURE WEBRTC TRANSMISSION', 320, 365);

      this.syntheticAnimId = requestAnimationFrame(render);
    };
    render();

    const videoStream = canvas.captureStream(30);
    const videoTrack = videoStream.getVideoTracks()[0];

    // Create silent audio track with Web Audio API
    let audioTrack;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // virtually silent
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();
      audioTrack = dest.stream.getAudioTracks()[0];
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }

    const tracks = [videoTrack];
    if (audioTrack) tracks.push(audioTrack);
    return new MediaStream(tracks);
  }

  /**
   * Initialize RTCPeerConnection and attach tracks
   */
  createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.iceCandidateQueue = [];

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
      console.log('Received remote track:', event.track?.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }

      this.remoteVideo.srcObject = this.remoteStream;
      this.remotePlaceholder.style.display = 'none';
      this.remoteVideo.style.display = 'block';

      const playPromise = this.remoteVideo.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Autoplay blocked unmuted video, muting to allow display:', err);
          this.remoteVideo.muted = true;
          this.remoteVideo.play();
        });
      }

      if (!this.callActive) {
        this.callActive = true;
        this.startCallTimer();
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('WebRTC Connection State:', state);
      if (state === 'connected') {
        if (this.callTimerEl && this.callTimerEl.textContent === 'Connecting...') {
          this.callTimerEl.textContent = '00:00';
        }
      } else if (state === 'disconnected' || state === 'failed') {
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

    if (this.syntheticAnimId) {
      cancelAnimationFrame(this.syntheticAnimId);
      this.syntheticAnimId = null;
    }

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
