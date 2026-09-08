/**
 * TerraChat 3D / OrbitSync - Main Application Orchestrator
 * Integrates 3D Globe, WebSocket Sync, WebRTC Audio/Video, Chat, Geolocation,
 * Cosmic Identity Onboarding (Name, Age, Gender, Image), and
 * Male-Female Cupid Love Arrow & Blushing Mermaid Interactive Animations.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Toast Notification Utility
  const toastContainer = document.getElementById('toast-container');
  window.showToast = function(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  };

  // 2. Initialize or restore Current User identity from localStorage
  let storedId = localStorage.getItem('orbitchat_user_id');
  if (!storedId) {
    storedId = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('orbitchat_user_id', storedId);
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const defaultNames = ['CosmoPioneer', 'AstroVoyager', 'NovaStargazer', 'SolarDrifter', 'OrbitalNomad', 'CyberAero'];
  const randomDefaultName = defaultNames[Math.floor(Math.random() * defaultNames.length)] + '#' + randomNum;

  let storedName = localStorage.getItem('orbitchat_user_name') || randomDefaultName;
  let storedAge = parseInt(localStorage.getItem('orbitchat_user_age') || '24', 10);
  let storedGender = localStorage.getItem('orbitchat_user_gender') || 'MALE';
  let storedAvatar = localStorage.getItem('orbitchat_user_avatar') ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(storedName)}`;
  let isOnboarded = localStorage.getItem('orbitchat_onboarded') === 'true';

  const currentUser = {
    id: storedId,
    name: storedName,
    age: storedAge,
    gender: storedGender,
    avatarUrl: storedAvatar,
    lat: 35.6762,
    lng: 139.6503,
    city: 'Detecting...',
    country: '',
    status: 'ONLINE'
  };

  // 3. UI Element References
  const myAvatarTop = document.getElementById('my-avatar-top') || document.getElementById('myAvatarTop');
  const myNameTop = document.getElementById('my-name-top') || document.getElementById('myNameTop');
  const myCityTop = document.getElementById('my-city-top') || document.getElementById('myCityTop');

  // Profile Form in Sidebar Tab
  const profileInputName = document.getElementById('profile-name-input');
  const profileAgeInput = document.getElementById('profile-age-input');
  const profileGenderSelect = document.getElementById('profile-gender-select');
  const profileAvatarImg = document.getElementById('profile-avatar-img');
  const profileFileUpload = document.getElementById('profile-file-upload');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const btnRandomAvatar = document.getElementById('btn-random-avatar');

  const profileCoordsDisplay = document.getElementById('profile-coords-display');
  const profileCityDisplay = document.getElementById('profile-city-display');
  const selectTeleportCity = document.getElementById('select-teleport-city');

  // Sidebar counters and lists
  const countOnlineUsers = document.getElementById('count-online-users');
  const countActiveLinks = document.getElementById('count-active-links');
  const userListContainer = document.getElementById('user-list-container');
  const linkListContainer = document.getElementById('link-list-container');
  const userSearchInput = document.getElementById('user-search-input');

  // Floating Target User Focus Modal
  const targetModal = document.getElementById('target-focus-modal');
  const targetModalAvatar = document.getElementById('target-modal-avatar');
  const targetModalName = document.getElementById('target-modal-name');
  const targetModalLocation = document.getElementById('target-modal-location');
  const targetModalLoveBtn = document.getElementById('target-modal-love-btn');
  const targetModalChatBtn = document.getElementById('target-modal-chat-btn');
  const targetModalCallBtn = document.getElementById('target-modal-call-btn');
  const targetModalCloseBtn = document.getElementById('target-modal-close-btn');

  // Cosmic Identity Setup Modal (First-Time Onboarding)
  const modalIdentitySetup = document.getElementById('modal-identity-setup');
  const formIdentitySetup = document.getElementById('form-identity-setup');
  const setupInputName = document.getElementById('setup-input-name');
  const setupInputAge = document.getElementById('setup-input-age');
  const btnGenderMale = document.getElementById('btn-gender-male');
  const btnGenderFemale = document.getElementById('btn-gender-female');
  const setupAvatarPreview = document.getElementById('setup-avatar-preview');
  const setupGenderBadge = document.getElementById('setup-gender-badge');
  const btnSetupReroll = document.getElementById('btn-setup-reroll');
  const setupImageUpload = document.getElementById('setup-image-upload');

  let setupSelectedGender = currentUser.gender || 'MALE';
  let setupCurrentAvatar = currentUser.avatarUrl;

  let selectedUserForModal = null;
  let activeUsersList = [];
  let activeLinksList = [];

  // Update UI with initial user profile
  function syncProfileUI() {
    if (myAvatarTop) myAvatarTop.src = currentUser.avatarUrl;
    if (myNameTop) {
      const gSym = currentUser.gender === 'FEMALE' ? '♀' : '♂';
      const gCls = currentUser.gender === 'FEMALE' ? 'female' : 'male';
      myNameTop.innerHTML = `${currentUser.name} <span class="marker-gender-badge ${gCls}" style="font-size:10px; padding:2px 7px;">${gSym} ${currentUser.age}</span>`;
    }
    if (myCityTop) myCityTop.textContent = currentUser.city;

    if (profileInputName) profileInputName.value = currentUser.name;
    if (profileAgeInput) profileAgeInput.value = currentUser.age;
    if (profileGenderSelect) profileGenderSelect.value = currentUser.gender;
    if (profileAvatarImg) profileAvatarImg.src = currentUser.avatarUrl;
    if (profileCoordsDisplay) profileCoordsDisplay.textContent = `${currentUser.lat.toFixed(4)}, ${currentUser.lng.toFixed(4)}`;
    if (profileCityDisplay) profileCityDisplay.textContent = `${currentUser.city}, ${currentUser.country}`;
  }
  syncProfileUI();

  // Populate Teleport City options
  if (selectTeleportCity && window.PRESET_CITIES) {
    window.PRESET_CITIES.forEach(city => {
      const opt = document.createElement('option');
      opt.value = city.name;
      opt.textContent = `${city.name}, ${city.country}`;
      selectTeleportCity.appendChild(opt);
    });
  }

  // 4. Initialize GeoLocation Service
  const geoService = new GeoLocationService();

  // 5. Initialize 3D Globe Manager
  const globeManager = new GlobeManager('globe-container', {
    onUserClick: (user) => {
      openTargetModal(user);
    }
  });
  globeManager.setCurrentUserId(currentUser.id);
  window.globeManager = globeManager;

  // 6. Initialize Chat & WebRTC Managers
  const chatManager = new ChatManager({
    currentUser: currentUser,
    wsClient: null
  });

  const callManager = new WebRTCCallManager({
    currentUser: currentUser,
    wsClient: null
  });

  // 7. Initialize WebSocket Client with STOMP Handlers
  const wsClient = new WebSocketClient({
    onUsersUpdate: (users) => {
      activeUsersList = users;
      if (countOnlineUsers) countOnlineUsers.textContent = users.length;
      globeManager.updateUsers(users);
      renderUsersList();
    },
    onLinksUpdate: (links) => {
      activeLinksList = links;
      if (countActiveLinks) countActiveLinks.textContent = links.length;
      globeManager.updateLinks(links);
      renderLinksList();
    },
    onLoveEvent: (loveData) => {
      // Incoming Cupid Love Arrow broadcast from any user across the globe
      if (!loveData) return;
      const maleUser = {
        id: loveData.maleUserId,
        name: loveData.maleUserName || 'Male Orbiter',
        lat: loveData.maleLat,
        lng: loveData.maleLng,
        gender: 'MALE'
      };
      const femaleUser = {
        id: loveData.femaleUserId,
        name: loveData.femaleUserName || 'Female Orbiter',
        lat: loveData.femaleLat,
        lng: loveData.femaleLng,
        gender: 'FEMALE'
      };
      globeManager.triggerLoveAnimation(maleUser, femaleUser);
    },
    onChatMessage: (msg) => {
      chatManager.handleIncomingMessage(msg);
    },
    onSignalMessage: (signal) => {
      callManager.handleSignalMessage(signal);
    },
    onConnectStatus: (isConnected) => {
      const connDot = document.getElementById('ws-conn-indicator');
      if (connDot) {
        connDot.style.backgroundColor = isConnected ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        connDot.style.boxShadow = isConnected ? '0 0 8px var(--accent-emerald)' : '0 0 8px var(--accent-rose)';
      }
    }
  });

  chatManager.setWsClient(wsClient);
  callManager.setWsClient(wsClient);

  // 8. Cosmic Identity Onboarding Setup Modal Handling
  function setupGenderSelection(gender) {
    setupSelectedGender = gender;
    if (gender === 'FEMALE') {
      btnGenderFemale.classList.add('active');
      btnGenderMale.classList.remove('active');
      setupGenderBadge.textContent = '♀';
      setupGenderBadge.className = 'setup-gender-indicator female';
    } else {
      btnGenderMale.classList.add('active');
      btnGenderFemale.classList.remove('active');
      setupGenderBadge.textContent = '♂';
      setupGenderBadge.className = 'setup-gender-indicator male';
    }
  }

  if (btnGenderMale && btnGenderFemale) {
    btnGenderMale.addEventListener('click', () => setupGenderSelection('MALE'));
    btnGenderFemale.addEventListener('click', () => setupGenderSelection('FEMALE'));
  }

  if (btnSetupReroll) {
    btnSetupReroll.addEventListener('click', () => {
      const seed = (setupInputName.value.trim() || 'Orbiter') + '_' + Math.random().toString(36).substring(2, 7);
      setupCurrentAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
      if (setupAvatarPreview) setupAvatarPreview.src = setupCurrentAvatar;
    });
  }

  if (setupImageUpload) {
    setupImageUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          setupCurrentAvatar = evt.target.result;
          if (setupAvatarPreview) setupAvatarPreview.src = setupCurrentAvatar;
          window.showToast('📷 Photo uploaded successfully!');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (formIdentitySetup) {
    formIdentitySetup.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredName = setupInputName.value.trim();
      const enteredAge = parseInt(setupInputAge.value, 10) || 24;
      const enteredGender = setupSelectedGender;

      if (!enteredName) {
        window.showToast('⚠️ Please enter a display name.');
        return;
      }

      currentUser.name = enteredName;
      currentUser.age = enteredAge;
      currentUser.gender = enteredGender;
      currentUser.avatarUrl = setupCurrentAvatar;

      localStorage.setItem('orbitchat_user_name', currentUser.name);
      localStorage.setItem('orbitchat_user_age', currentUser.age.toString());
      localStorage.setItem('orbitchat_user_gender', currentUser.gender);
      localStorage.setItem('orbitchat_user_avatar', currentUser.avatarUrl);
      localStorage.setItem('orbitchat_onboarded', 'true');

      if (modalIdentitySetup) modalIdentitySetup.style.display = 'none';
      syncProfileUI();

      // Notify Spring Boot server of updated profile
      wsClient.updateProfile(currentUser);
      globeManager.updateUsers([currentUser, ...activeUsersList.filter(u => u.id !== currentUser.id)]);
      renderUsersList();

      window.showToast(`✨ Welcome aboard, ${currentUser.name}! (${currentUser.gender === 'FEMALE' ? '♀ Female' : '♂ Male'}, ${currentUser.age})`);
    });
  }

  // Show Onboarding Modal if not onboarded yet
  if (!isOnboarded && modalIdentitySetup) {
    setupInputName.value = currentUser.name.startsWith('Cosmo') || currentUser.name.startsWith('Astro') ? '' : currentUser.name;
    setupInputAge.value = currentUser.age;
    setupCurrentAvatar = currentUser.avatarUrl;
    if (setupAvatarPreview) setupAvatarPreview.src = setupCurrentAvatar;
    setupGenderSelection(currentUser.gender);
    modalIdentitySetup.style.display = 'flex';
  }

  // 9. Acquire User Location and Connect WebSocket
  try {
    const loc = await geoService.acquireLocation();
    currentUser.lat = loc.lat;
    currentUser.lng = loc.lng;
    currentUser.city = loc.city;
    currentUser.country = loc.country;
    syncProfileUI();

    globeManager.focusUser(currentUser, 2.0);
    window.showToast(`📍 Location synchronized: ${currentUser.city}, ${currentUser.country} (${loc.source})`);
  } catch (e) {
    console.warn('Geolocation acquisition warning:', e);
  }

  // Connect STOMP WebSocket
  wsClient.connect(currentUser.id, currentUser);

  // 10. Execute Cupid Love Arrow Interaction (Male to Female)
  function executeLoveInteraction(userA, userB) {
    if (!userA || !userB) return;

    const uAGender = (userA.gender || 'MALE').toUpperCase();
    const uBGender = (userB.gender || 'MALE').toUpperCase();

    // Condition Check: Only Male <-> Female pair allows Cupid Love Arrow & Blushing Mermaid
    const isMaleFemale =
      (uAGender === 'MALE' && uBGender === 'FEMALE') ||
      (uAGender === 'FEMALE' && uBGender === 'MALE');

    if (!isMaleFemale) {
      // "apart from this condition male-male or female to female dont dont any thing"
      window.showToast('ℹ️ Love Arrow is exclusive to Male & Female interactions.');
      return;
    }

    const maleUser = uAGender === 'MALE' ? userA : userB;
    const femaleUser = uAGender === 'FEMALE' ? userA : userB;

    // Smoothly fly camera midway between male and female so user sees the flight
    const midLat = (maleUser.lat + femaleUser.lat) / 2;
    const midLng = (maleUser.lng + femaleUser.lng) / 2;
    globeManager.focusUser({ lat: midLat, lng: midLng }, 3.5);

    // Trigger local animation immediately
    globeManager.triggerLoveAnimation(maleUser, femaleUser);

    // Broadcast Cupid event to all clients globally via Spring Boot
    wsClient.shootLove({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderGender: currentUser.gender,
      targetId: userB.id === currentUser.id ? userA.id : userB.id,
      maleUserId: maleUser.id,
      maleUserName: maleUser.name,
      maleLat: maleUser.lat,
      maleLng: maleUser.lng,
      femaleUserId: femaleUser.id,
      femaleUserName: femaleUser.name,
      femaleLat: femaleUser.lat,
      femaleLng: femaleUser.lng
    });

    window.showToast(`💘 Cupid summoned! Sending love arrow from ${maleUser.name} to ${femaleUser.name}! 🧜‍♀️`);
  }

  // 11. Floating Target User Action Modal (when clicking user pin on globe)
  function openTargetModal(user) {
    selectedUserForModal = user;
    if (targetModalAvatar) {
      targetModalAvatar.src = user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(user.name);
    }
    if (targetModalName) {
      const gSym = (user.gender || '').toUpperCase() === 'FEMALE' ? '♀' : '♂';
      const gCls = (user.gender || '').toUpperCase() === 'FEMALE' ? 'female' : 'male';
      targetModalName.innerHTML = `${user.name} <span class="marker-gender-badge ${gCls}" style="font-size:10px; padding:2px 7px;">${gSym} ${user.age || 24}</span>`;
    }

    const dist = GeoLocationService.getDistanceKm(currentUser.lat, currentUser.lng, user.lat, user.lng);
    if (targetModalLocation) {
      targetModalLocation.textContent = `${user.city || 'Earth'}, ${user.country || ''} • ${dist.toLocaleString()} km away`;
    }

    const isMe = user.id === currentUser.id;
    const curGender = (currentUser.gender || 'MALE').toUpperCase();
    const tgtGender = (user.gender || 'MALE').toUpperCase();

    // Love Arrow condition: Only for Male <-> Female interactions
    const isMaleFemale =
      (curGender === 'MALE' && tgtGender === 'FEMALE') ||
      (curGender === 'FEMALE' && tgtGender === 'MALE');

    if (isMe) {
      targetModalChatBtn.style.display = 'none';
      targetModalCallBtn.style.display = 'none';
      if (targetModalLoveBtn) targetModalLoveBtn.style.display = 'none';
    } else {
      targetModalChatBtn.style.display = 'inline-flex';
      targetModalCallBtn.style.display = 'inline-flex';

      if (targetModalLoveBtn) {
        if (isMaleFemale) {
          targetModalLoveBtn.style.display = 'inline-flex';
          targetModalLoveBtn.title = curGender === 'MALE'
            ? `Shoot Cupid's Love Arrow to ${user.name}`
            : `Send Cupid's Love Arrow from ${user.name}`;
        } else {
          // Male-Male or Female-Female: hide Love Arrow button completely
          targetModalLoveBtn.style.display = 'none';
        }
      }
    }

    targetModal.style.display = 'flex';
  }

  if (targetModalCloseBtn) {
    targetModalCloseBtn.addEventListener('click', () => {
      targetModal.style.display = 'none';
      selectedUserForModal = null;
    });
  }

  if (targetModalLoveBtn) {
    targetModalLoveBtn.addEventListener('click', () => {
      if (selectedUserForModal) {
        executeLoveInteraction(currentUser, selectedUserForModal);
        targetModal.style.display = 'none';
      }
    });
  }

  if (targetModalChatBtn) {
    targetModalChatBtn.addEventListener('click', () => {
      if (selectedUserForModal) {
        chatManager.openWithUser(selectedUserForModal);
        targetModal.style.display = 'none';
      }
    });
  }

  if (targetModalCallBtn) {
    targetModalCallBtn.addEventListener('click', () => {
      if (selectedUserForModal) {
        callManager.startCall(selectedUserForModal);
        targetModal.style.display = 'none';
      }
    });
  }

  // 12. Render Active Users Directory in Sidebar
  function renderUsersList() {
    const filter = (userSearchInput ? userSearchInput.value : '').toLowerCase();
    userListContainer.innerHTML = '';

    const filtered = activeUsersList.filter(u =>
      u.name.toLowerCase().includes(filter) ||
      (u.city && u.city.toLowerCase().includes(filter)) ||
      (u.country && u.country.toLowerCase().includes(filter))
    );

    if (filtered.length === 0) {
      userListContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:20px 0;">No active users found</div>';
      return;
    }

    const curGender = (currentUser.gender || 'MALE').toUpperCase();

    filtered.forEach(user => {
      const isMe = user.id === currentUser.id;
      const dist = GeoLocationService.getDistanceKm(currentUser.lat, currentUser.lng, user.lat, user.lng);
      const isFemale = (user.gender || '').toUpperCase() === 'FEMALE';
      const userGender = isFemale ? 'FEMALE' : 'MALE';

      const isMaleFemale =
        (curGender === 'MALE' && userGender === 'FEMALE') ||
        (curGender === 'FEMALE' && userGender === 'MALE');

      const card = document.createElement('div');
      card.className = 'user-card';

      card.innerHTML = `
        <div class="user-card-main">
          <div class="user-avatar-wrap">
            <img src="${user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(user.name)}" alt="${user.name}">
            <div class="marker-status-dot ${user.status === 'IN_CALL' ? 'in-call' : ''}"></div>
          </div>
          <div class="user-details">
            <div class="user-card-name-row">
              <span class="user-card-name">${user.name}</span>
              <span class="marker-gender-badge ${isFemale ? 'female' : 'male'}">${isFemale ? '♀' : '♂'} ${user.age || 24}</span>
              ${isMe ? '<span class="marker-badge-me">YOU</span>' : ''}
            </div>
            <span class="user-card-sub">
              ${user.city || 'Global'} • <span class="user-distance-badge">${isMe ? 'Here' : dist.toLocaleString() + ' km'}</span>
            </span>
          </div>
        </div>
        <div class="user-card-actions">
          <button class="btn btn-secondary btn-icon btn-sm btn-fly" title="Fly to user on Globe">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="12 8 8 12 12 16 12 8"/></svg>
          </button>
          ${!isMe ? `
            ${isMaleFemale ? `
              <button class="btn btn-love btn-icon btn-sm btn-card-love" title="Shoot Cupid Love Arrow">
                💘
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-icon btn-sm btn-chat" title="Send Chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button class="btn btn-video btn-icon btn-sm btn-call" title="Start Video Call">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </button>
          ` : ''}
        </div>
      `;

      // Event handlers for user card buttons
      const btnFly = card.querySelector('.btn-fly');
      if (btnFly) {
        btnFly.addEventListener('click', (e) => {
          e.stopPropagation();
          globeManager.focusUser(user, 16.5);
          openTargetModal(user);
        });
      }

      const btnCardLove = card.querySelector('.btn-card-love');
      if (btnCardLove) {
        btnCardLove.addEventListener('click', (e) => {
          e.stopPropagation();
          executeLoveInteraction(currentUser, user);
        });
      }

      const btnChat = card.querySelector('.btn-chat');
      if (btnChat) {
        btnChat.addEventListener('click', (e) => {
          e.stopPropagation();
          globeManager.focusUser(user, 16.5);
          chatManager.openWithUser(user);
        });
      }

      const btnCall = card.querySelector('.btn-call');
      if (btnCall) {
        btnCall.addEventListener('click', (e) => {
          e.stopPropagation();
          globeManager.focusUser(user, 16.5);
          callManager.startCall(user);
        });
      }

      // Clicking the whole card focuses the user
      card.addEventListener('click', () => {
        globeManager.focusUser(user, 16.5);
        openTargetModal(user);
      });

      userListContainer.appendChild(card);
    });
  }

  if (userSearchInput) {
    userSearchInput.addEventListener('input', () => renderUsersList());
  }

  // 13. Render Active 3D Links in Sidebar
  function renderLinksList() {
    linkListContainer.innerHTML = '';
    if (activeLinksList.length === 0) {
      linkListContainer.innerHTML = '<div style="color:var(--text-muted); font-size:12px; text-align:center; padding:20px 0;">No active globe connection arcs</div>';
      return;
    }

    activeLinksList.forEach(link => {
      const card = document.createElement('div');
      card.className = 'link-card';
      const isVideo = link.type === 'VIDEO';
      const isLove = link.isLoveLink || link.loveLink;
      const linkColor = link.color || (window.getLinkColor ? window.getLinkColor(link) : (isVideo ? '#a855f7' : '#00f0ff'));

      card.innerHTML = `
        <div class="link-header">
          <span class="link-badge" style="background: ${linkColor}22; color: ${linkColor}; border: 1px solid ${linkColor}66;">
            ● ${isLove ? '💘 LOVE' : link.type} ${isLove ? 'CHANNEL' : 'ARC'}
          </span>
          <span style="font-family:var(--font-mono); font-size:10px; color:${linkColor}; font-weight:600;">Active Link</span>
        </div>
        <div class="link-peers">
          <span>${link.user1Name}</span>
          <span style="color:${linkColor}; font-weight:800; font-size:14px;">${isLove ? '🏹' : '⟷'}</span>
          <span>${link.user2Name}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        // Fly camera to midpoint between both users
        const midLat = (link.user1Lat + link.user2Lat) / 2;
        const midLng = (link.user1Lng + link.user2Lng) / 2;
        globeManager.focusUser({ lat: midLat, lng: midLng }, 4.0);
      });

      linkListContainer.appendChild(card);
    });
  }

  // 14. Profile Tab Modification (Name, Age, Gender, Custom Image)
  if (btnRandomAvatar) {
    btnRandomAvatar.addEventListener('click', () => {
      const seed = (currentUser.name || 'avatar') + '_' + Math.random().toString(36).substring(2, 8);
      currentUser.avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
      localStorage.setItem('orbitchat_user_avatar', currentUser.avatarUrl);
      syncProfileUI();
      wsClient.updateProfile(currentUser);
      window.showToast('🎨 Avatar updated!');
    });
  }

  if (profileFileUpload) {
    profileFileUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentUser.avatarUrl = evt.target.result;
          localStorage.setItem('orbitchat_user_avatar', currentUser.avatarUrl);
          syncProfileUI();
          wsClient.updateProfile(currentUser);
          globeManager.updateUsers([currentUser, ...activeUsersList.filter(u => u.id !== currentUser.id)]);
          window.showToast('📷 Photo profile uploaded successfully!');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', () => {
      const newName = profileInputName.value.trim();
      const newAge = parseInt(profileAgeInput.value, 10) || currentUser.age;
      const newGender = profileGenderSelect.value || currentUser.gender;

      if (newName) {
        currentUser.name = newName;
        currentUser.age = newAge;
        currentUser.gender = newGender;

        localStorage.setItem('orbitchat_user_name', newName);
        localStorage.setItem('orbitchat_user_age', newAge.toString());
        localStorage.setItem('orbitchat_user_gender', newGender);

        syncProfileUI();
        wsClient.updateProfile(currentUser);
        globeManager.updateUsers([currentUser, ...activeUsersList.filter(u => u.id !== currentUser.id)]);
        renderUsersList();
        window.showToast(`💾 Profile updated: ${newName} (${newGender === 'FEMALE' ? '♀' : '♂'}, ${newAge})`);
      }
    });
  }

  // Backward compatibility for save name button if exists
  const btnSaveName = document.getElementById('btn-save-name');
  if (btnSaveName) {
    btnSaveName.addEventListener('click', () => {
      if (btnSaveProfile) btnSaveProfile.click();
    });
  }

  // 15. Teleport to Preset City (for testing multiple browser tabs locally)
  const btnTeleport = document.getElementById('btn-teleport');
  if (btnTeleport) {
    btnTeleport.addEventListener('click', () => {
      const city = selectTeleportCity.value;
      if (city) {
        const loc = geoService.teleport(city);
        if (loc) {
          currentUser.lat = loc.lat;
          currentUser.lng = loc.lng;
          currentUser.city = loc.city;
          currentUser.country = loc.country;
          syncProfileUI();

          // Broadcast updated coordinates to Spring Boot
          wsClient.updateLocation({
            userId: currentUser.id,
            lat: currentUser.lat,
            lng: currentUser.lng,
            city: currentUser.city,
            country: currentUser.country
          });

          globeManager.focusUser(currentUser, 15.0);
          window.showToast(`🚀 Teleported to ${loc.city}, ${loc.country}!`);
        }
      }
    });
  }

  // GPS Re-detection button
  const btnDetectGps = document.getElementById('btn-detect-gps');
  if (btnDetectGps) {
    btnDetectGps.addEventListener('click', async () => {
      try {
        window.showToast('📡 Acquiring real GPS coordinates...');
        const loc = await geoService.acquireLocation();
        currentUser.lat = loc.lat;
        currentUser.lng = loc.lng;
        currentUser.city = loc.city;
        currentUser.country = loc.country;
        syncProfileUI();

        wsClient.updateLocation({
          userId: currentUser.id,
          lat: currentUser.lat,
          lng: currentUser.lng,
          city: currentUser.city,
          country: currentUser.country
        });

        globeManager.focusUser(currentUser, 1.4);
        window.showToast(`📍 GPS Updated: ${loc.city}, ${loc.country}`);
      } catch (e) {
        window.showToast('⚠️ Could not fetch GPS location.');
      }
    });
  }

  // 16. Sidebar Tabs Navigation
  const tabs = document.querySelectorAll('.sidebar-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(tab.dataset.tab);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // Sidebar Collapse / Expand Toggle
  const sidebarPanel = document.getElementById('sidebar-panel');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  if (sidebarToggleBtn && sidebarPanel) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebarPanel.classList.toggle('collapsed');
    });
  }

  // 17. Header Open Global Chat
  const btnOpenGlobalChat = document.getElementById('btn-open-global-chat');
  if (btnOpenGlobalChat) {
    btnOpenGlobalChat.addEventListener('click', () => {
      chatManager.openGlobal();
    });
  }

  // 18. Google Earth Navigation Controls (Bottom-Right)
  const btnCompass = document.getElementById('earth-ctrl-compass');
  if (btnCompass) {
    btnCompass.addEventListener('click', () => {
      globeManager.resetCompass();
      window.showToast('🧭 Oriented North');
    });
  }

  const btn3D = document.getElementById('earth-ctrl-3d');
  if (btn3D) {
    btn3D.addEventListener('click', () => {
      const is3D = globeManager.toggle3D();
      btn3D.classList.toggle('active', is3D);
      btn3D.textContent = is3D ? '2D' : '3D';
      window.showToast(is3D ? '📐 3D Perspective Mode' : '🗺 Top-Down 2D Mode');
    });
  }

  const btnToggleSpin = document.getElementById('earth-ctrl-spin');
  if (btnToggleSpin) {
    btnToggleSpin.addEventListener('click', () => {
      const spinning = globeManager.toggleAutoSpin();
      btnToggleSpin.classList.toggle('active', spinning);
      window.showToast(spinning ? '🌐 Earth auto-spin enabled' : '⏸ Earth auto-spin paused');
    });
  }

  const btnCycleLayers = document.getElementById('earth-ctrl-layers');
  if (btnCycleLayers) {
    btnCycleLayers.addEventListener('click', () => {
      const mode = globeManager.cycleLayers();
      window.showToast(`🗺 Layer: ${mode.toUpperCase()}`);
    });
  }

  const btnMyLoc = document.getElementById('earth-ctrl-my-loc');
  if (btnMyLoc) {
    btnMyLoc.addEventListener('click', () => {
      globeManager.focusUser(currentUser, 16.5);
      window.showToast('🎯 Zoomed in to your street location');
    });
  }

  const btnZoomIn = document.getElementById('earth-ctrl-zoomin');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      globeManager.zoomIn();
    });
  }

  const btnZoomOut = document.getElementById('earth-ctrl-zoomout');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      globeManager.zoomOut();
    });
  }

  // Initial user list render
  renderUsersList();
  renderLinksList();
});
