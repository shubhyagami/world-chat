const USER_PALETTE = [
  '#00f0ff', // Neon Cyan
  '#ff007f', // Neon Hot Pink
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Gold
  '#a855f7', // Electric Purple
  '#3b82f6', // Royal Blue
  '#ff5722', // Neon Deep Orange
  '#14b8a6', // Bright Teal
  '#e11d48', // Crimson Rose
  '#84cc16', // Electric Lime
  '#8b5cf6', // Violet
  '#d946ef', // Neon Magenta
  '#06b6d4', // Electric Turquoise
  '#f43f5e'  // Coral Red
];

function getUserColor(id) {
  if (!id) return USER_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return USER_PALETTE[Math.abs(hash) % USER_PALETTE.length];
}

function getLinkColor(link) {
  if (link.color && !link.color.startsWith('rgb(0,') && link.color !== '#00f0ff' && link.color !== '#a855f7') {
    return link.color;
  }
  const idStr = link.id || (link.user1Id + '_' + link.user2Id);
  return getUserColor(idStr);
}

window.getUserColor = getUserColor;
window.getLinkColor = getLinkColor;
window.USER_PALETTE = USER_PALETTE;

class GlobeManager {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.map = null;
    this.users = [];
    this.links = [];
    this.markersMap = new Map(); // userId -> maplibregl.Marker
    this.currentUserId = null;
    this.isAutoSpinning = true;
    this.spinAnimationId = null;
    this.currentLayerMode = 'hybrid'; // 'hybrid', 'satellite', 'osm'
    this.onUserClickCallback = options.onUserClick || null;
    this.onCameraMoveCallback = options.onCameraMove || null;

    this.injectLoveAnimationStyles();
    this.init();
  }

  injectLoveAnimationStyles() {
    if (document.getElementById('love-animations-style')) return;
    const style = document.createElement('style');
    style.id = 'love-animations-style';
    style.textContent = `
      .cosmic-cupid-sprite {
        pointer-events: none !important;
        z-index: 1000 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }
      .cosmic-cupid-sprite .cupid-inner {
        position: relative;
        width: 85px;
        height: 85px;
        animation: cupidHoverAnim 2.5s infinite ease-in-out;
        transform-origin: center bottom;
      }
      .cosmic-cupid-sprite .cupid-inner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
        border: 3px solid #ff007f;
        box-shadow: 0 0 20px rgba(255, 0, 127, 0.9), 0 0 35px rgba(255, 215, 0, 0.7);
      }
      .cosmic-cupid-sprite .cupid-halo {
        position: absolute;
        top: -9px;
        left: 50%;
        transform: translateX(-50%);
        width: 28px;
        height: 9px;
        border-radius: 50%;
        border: 2px solid #ffd700;
        box-shadow: 0 0 12px #ffd700;
        animation: haloGlowAnim 1.5s infinite alternate;
      }
      .cosmic-mermaid-sprite {
        pointer-events: none !important;
        z-index: 1002 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
      }
      .cosmic-mermaid-sprite .mermaid-inner {
        position: relative;
        width: 105px;
        height: 105px;
        animation: mermaidFloatAnim 2s infinite ease-in-out;
        transform-origin: center bottom;
      }
      .cosmic-mermaid-sprite .mermaid-inner img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
        border: 3px solid #ff007f;
        box-shadow: 0 0 25px rgba(255, 0, 127, 0.95), 0 0 45px rgba(0, 240, 255, 0.7);
      }
      .cosmic-mermaid-sprite .mermaid-blush-glow {
        position: absolute;
        top: 48%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 55px;
        height: 26px;
        background: radial-gradient(ellipse at center, rgba(255, 0, 127, 0.9) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        animation: blushPulseAnim 1.2s infinite alternate;
      }
      .cosmic-mermaid-sprite .mermaid-bubble-hearts {
        position: absolute;
        top: -20px;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .cosmic-mermaid-sprite .bubble-heart {
        position: absolute;
        font-size: 18px;
        animation: bubbleRiseAnim 2s infinite ease-out;
      }
      .cosmic-mermaid-sprite .bubble-heart:nth-child(1) { left: 15%; animation-delay: 0s; }
      .cosmic-mermaid-sprite .bubble-heart:nth-child(2) { left: 45%; animation-delay: 0.6s; font-size: 22px; }
      .cosmic-mermaid-sprite .bubble-heart:nth-child(3) { left: 75%; animation-delay: 1.2s; font-size: 16px; }

      @keyframes cupidHoverAnim {
        0%, 100% { transform: translateY(0) scale(1) rotate(-3deg); }
        50% { transform: translateY(-12px) scale(1.05) rotate(3deg); }
      }
      @keyframes haloGlowAnim {
        from { opacity: 0.7; transform: translateX(-50%) scale(0.9); }
        to { opacity: 1; transform: translateX(-50%) scale(1.1); }
      }
      @keyframes mermaidFloatAnim {
        0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
        50% { transform: translateY(-12px) scale(1.04) rotate(-2deg); }
      }
      @keyframes blushPulseAnim {
        from { opacity: 0.5; transform: translate(-50%, -50%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
      }
      @keyframes bubbleRiseAnim {
        0% { opacity: 1; transform: translateY(20px) scale(0.6); }
        100% { opacity: 0; transform: translateY(-60px) scale(1.3); }
      }
    `;
    document.head.appendChild(style);
  }

  init() {
    // Initialize MapLibre GL map with Globe projection
    this.map = new maplibregl.Map({
      container: this.containerId,
      zoom: 1.8,
      center: [20, 25],
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Esri World Imagery'
          },
          'esri-labels': {
            type: 'raster',
            tiles: [
              'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19
          },
          'osm-streets': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'OpenStreetMap'
          },
          'connection-arcs': {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            layout: { visibility: 'visible' }
          },
          {
            id: 'labels-layer',
            type: 'raster',
            source: 'esri-labels',
            layout: { visibility: 'visible' }
          },
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-streets',
            layout: { visibility: 'none' }
          },
          {
            id: 'arcs-glow',
            type: 'line',
            source: 'connection-arcs',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#00f0ff'],
              'line-width': 8,
              'line-opacity': 0.85,
              'line-blur': 4
            }
          },
          {
            id: 'arcs-core',
            type: 'line',
            source: 'connection-arcs',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#00f0ff'],
              'line-width': 3.5,
              'line-opacity': 0.95
            }
          },
          {
            id: 'arcs-inner',
            type: 'line',
            source: 'connection-arcs',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': 1.2,
              'line-opacity': 0.9
            }
          }
        ]
      }
    });

    // Set 3D Globe projection
    this.map.on('style.load', () => {
      try {
        this.map.setProjection({ type: 'globe' });
      } catch (e) {
        console.warn('MapLibre globe projection notice:', e);
      }
      this.updateArcsSource();
    });

    // Auto-spin globe when idle
    this.startAutoSpin();

    // Pause spin on user interaction
    this.map.on('mousedown', () => this.stopAutoSpin());
    this.map.on('touchstart', () => this.stopAutoSpin());

    // Update status bar with live camera altitude & coordinates and marker occlusion
    this.map.on('move', () => {
      this.updateCameraStatus();
      this.updateMarkerVisibility();
    });
    this.map.on('render', () => {
      this.updateMarkerVisibility();
    });
  }

  /**
   * Start smooth slow rotation of the globe
   */
  startAutoSpin() {
    if (this.spinAnimationId) return;

    const spin = () => {
      if (this.isAutoSpinning && this.map && this.map.getZoom() < 4) {
        const center = this.map.getCenter();
        let newLng = center.lng - 0.15;
        while (newLng < -180) newLng += 360;
        while (newLng > 180) newLng -= 360;
        this.map.easeTo({ center: [newLng, center.lat], duration: 100, easing: n => n });
      }
      this.spinAnimationId = requestAnimationFrame(spin);
    };
    this.spinAnimationId = requestAnimationFrame(spin);
  }

  stopAutoSpin() {
    if (this.spinAnimationId) {
      cancelAnimationFrame(this.spinAnimationId);
      this.spinAnimationId = null;
    }
  }

  toggleAutoSpin() {
    this.isAutoSpinning = !this.isAutoSpinning;
    if (this.isAutoSpinning) {
      this.startAutoSpin();
    } else {
      this.stopAutoSpin();
    }
    return this.isAutoSpinning;
  }

  /**
   * Calculate camera elevation in meters / km and coordinates
   */
  updateCameraStatus() {
    if (!this.map) return;
    const center = this.map.getCenter();
    const zoom = this.map.getZoom();

    // Approximate camera altitude from zoom level
    // Zoom 0 ~ 20,000 km, Zoom 19 ~ 100 meters
    const earthCircumferenceMeters = 40075000;
    const altitudeMeters = earthCircumferenceMeters / Math.pow(2, zoom) * 0.6;

    let altStr = '';
    if (altitudeMeters >= 1000000) {
      altStr = `${(altitudeMeters / 1000000).toFixed(1)} km`;
    } else if (altitudeMeters >= 1000) {
      altStr = `${Math.round(altitudeMeters / 1000).toLocaleString()} km`;
    } else {
      altStr = `${Math.round(altitudeMeters)} m`;
    }

    // Format coordinates into DMS (Degrees, Minutes, Seconds)
    const latDms = this.formatDMS(center.lat, true);
    const lngDms = this.formatDMS(center.lng, false);

    if (this.onCameraMoveCallback) {
      this.onCameraMoveCallback({
        coords: `${latDms}  ${lngDms}`,
        altitude: altStr,
        zoom: zoom.toFixed(1)
      });
    }

    const coordsEl = document.getElementById('status-coords');
    const altEl = document.getElementById('status-altitude');
    if (coordsEl) coordsEl.textContent = `${latDms}  ${lngDms}`;
    if (altEl) altEl.textContent = altStr;
  }

  formatDMS(deg, isLat) {
    const absolute = Math.abs(deg);
    const d = Math.floor(absolute);
    const minutesNotTruncated = (absolute - d) * 60;
    const m = Math.floor(minutesNotTruncated);
    const s = ((minutesNotTruncated - m) * 60).toFixed(1);
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    return `${d}°${m}'${s}" ${dir}`;
  }

  /**
   * Hide markers that are occluded behind the curve/horizon of the 3D globe
   */
  updateMarkerVisibility() {
    if (!this.map) return;

    const hasOcclusionChecker = this.map.transform && typeof this.map.transform.isLocationOccluded === 'function';

    this.users.forEach(user => {
      const marker = this.markersMap.get(user.id);
      if (!marker) return;

      const el = marker.getElement();
      let normLng = user.lng;
      while (normLng < -180) normLng += 360;
      while (normLng > 180) normLng -= 360;

      let isOccluded = false;

      if (hasOcclusionChecker) {
        // Use MapLibre native 3D globe horizon occlusion test
        isOccluded = this.map.transform.isLocationOccluded(new maplibregl.LngLat(normLng, user.lat));
      } else {
        // Fallback spherical central angle calculation
        const center = this.map.getCenter();
        const centerRadLat = center.lat * Math.PI / 180;
        const userRadLat = user.lat * Math.PI / 180;
        const dLng = (normLng - center.lng) * Math.PI / 180;
        const cosDist = Math.sin(centerRadLat) * Math.sin(userRadLat) +
                        Math.cos(centerRadLat) * Math.cos(userRadLat) * Math.cos(dLng);
        isOccluded = cosDist < 0.25;
      }

      if (isOccluded) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.visibility = 'hidden';
      } else {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.visibility = 'visible';
      }
    });
  }

  /**
   * Toggle 2D / 3D perspective angle
   */
  toggle3D() {
    if (!this.map) return false;
    const currentPitch = this.map.getPitch();
    const is3D = currentPitch < 30;
    this.map.easeTo({
      pitch: is3D ? 60 : 0,
      duration: 1000
    });
    return is3D;
  }

  /**
   * Orient North
   */
  resetCompass() {
    if (this.map) {
      this.map.easeTo({ bearing: 0, duration: 800 });
    }
  }

  /**
   * Switch between Satellite Hybrid, Clean Satellite, and OSM
   */
  cycleLayers() {
    if (!this.map || !this.map.isStyleLoaded()) return this.currentLayerMode;

    const modes = ['hybrid', 'satellite', 'osm'];
    const nextIdx = (modes.indexOf(this.currentLayerMode) + 1) % modes.length;
    this.currentLayerMode = modes[nextIdx];

    const satVisible = this.currentLayerMode === 'hybrid' || this.currentLayerMode === 'satellite';
    const labelsVisible = this.currentLayerMode === 'hybrid';
    const osmVisible = this.currentLayerMode === 'osm';

    this.map.setLayoutProperty('satellite-layer', 'visibility', satVisible ? 'visible' : 'none');
    this.map.setLayoutProperty('labels-layer', 'visibility', labelsVisible ? 'visible' : 'none');
    this.map.setLayoutProperty('osm-layer', 'visibility', osmVisible ? 'visible' : 'none');

    const statusLayerEl = document.getElementById('status-layer-mode');
    if (statusLayerEl) {
      statusLayerEl.textContent = this.currentLayerMode === 'hybrid' ? 'Satellite 3D Hybrid' :
                                  (this.currentLayerMode === 'satellite' ? 'Clean Satellite' : 'OpenStreetMap');
    }

    return this.currentLayerMode;
  }

  /**
   * Fly camera smoothly to a user or position down to street level
   */
  focusUser(user, targetZoom = 16.5) {
    if (!this.map || !user || user.lat === undefined || user.lng === undefined) return;
    this.stopAutoSpin();

    this.map.flyTo({
      center: [user.lng, user.lat],
      zoom: targetZoom,
      pitch: targetZoom > 12 ? 55 : 0,
      bearing: 0,
      essential: true,
      duration: 2600
    });
  }

  /**
   * Update active users and their perpendicular 3D HTML markers
   */
  updateUsers(userList) {
    this.users = userList || [];
    if (!this.map) return;

    const activeUserIds = new Set(this.users.map(u => u.id));

    // Remove markers of disconnected users
    for (const [userId, marker] of this.markersMap.entries()) {
      if (!activeUserIds.has(userId)) {
        marker.remove();
        this.markersMap.delete(userId);
      }
    }

    // Add or update markers
    this.users.forEach(user => {
      let normLng = user.lng;
      while (normLng < -180) normLng += 360;
      while (normLng > 180) normLng -= 360;

      let marker = this.markersMap.get(user.id);
      if (!marker) {
        const el = this.createMarkerElement(user);
        marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom'
        })
        .setLngLat([normLng, user.lat])
        .addTo(this.map);

        this.markersMap.set(user.id, marker);
      } else {
        // Update position and status
        marker.setLngLat([normLng, user.lat]);
        this.updateMarkerElement(marker.getElement(), user);
      }
    });

    this.updateMarkerVisibility();
  }

  /**
   * Create custom HTML billboard marker perpendicular to ground with exact ground pin
   */
  createMarkerElement(user) {
    const isMe = user.id === this.currentUserId;
    const isInCall = user.status === 'IN_CALL';
    const userColor = user.color || getUserColor(user.id);

    const anchor = document.createElement('div');
    anchor.className = 'custom-map-marker';
    anchor.id = `marker-${user.id}`;

    // 1. Floating billboard card (Top)
    const billboard = document.createElement('div');
    billboard.className = 'marker-billboard';
    billboard.style.borderColor = userColor;
    billboard.style.boxShadow = `0 6px 20px rgba(0, 0, 0, 0.7), 0 0 12px ${userColor}55`;

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'marker-avatar-wrap';

    const img = document.createElement('img');
    img.src = user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(user.name);
    img.alt = user.name;
    img.style.borderColor = userColor;

    const dot = document.createElement('div');
    dot.className = `marker-status-dot ${isInCall ? 'in-call' : ''}`;
    dot.style.backgroundColor = userColor;
    dot.style.boxShadow = `0 0 6px ${userColor}`;

    avatarWrap.appendChild(img);
    avatarWrap.appendChild(dot);

    const info = document.createElement('div');
    info.className = 'marker-info';

    const nameRow = document.createElement('div');
    nameRow.style.display = 'flex';
    nameRow.style.alignItems = 'center';

    const name = document.createElement('span');
    name.className = 'marker-name';
    name.textContent = user.name;
    nameRow.appendChild(name);

    const isFemale = (user.gender || '').toUpperCase() === 'FEMALE';
    const genderBadge = document.createElement('span');
    genderBadge.className = `marker-gender-badge ${isFemale ? 'female' : 'male'}`;
    genderBadge.textContent = `${isFemale ? '♀' : '♂'} ${user.age || 24}`;
    nameRow.appendChild(genderBadge);

    if (isMe) {
      const meBadge = document.createElement('span');
      meBadge.className = 'marker-badge-me';
      meBadge.textContent = 'YOU';
      nameRow.appendChild(meBadge);
    }

    const location = document.createElement('span');
    location.className = 'marker-location';
    location.textContent = `${user.city || 'World'}`;

    info.appendChild(nameRow);
    info.appendChild(location);

    billboard.appendChild(avatarWrap);
    billboard.appendChild(info);

    // 2. Vertical stem pin pointing to ground (Middle)
    const stem = document.createElement('div');
    stem.className = 'marker-pin-stem';
    stem.style.background = `linear-gradient(to top, ${userColor}, rgba(255, 255, 255, 0.4), transparent)`;
    stem.style.boxShadow = `0 0 6px ${userColor}`;

    // 2.5 Needle Tip pointing down to the exact contact point
    const needleTip = document.createElement('div');
    needleTip.className = 'marker-needle-tip';
    needleTip.style.borderTopColor = userColor;

    // 3. Ground pin point & radar ripple (Bottom - THE EXACT LAT/LNG COORDINATE)
    const groundPoint = document.createElement('div');
    groundPoint.className = 'marker-ground-point';

    const groundDot = document.createElement('div');
    groundDot.className = 'marker-ground-dot';
    groundDot.style.backgroundColor = userColor;
    groundDot.style.boxShadow = `0 0 10px ${userColor}`;

    const groundRing = document.createElement('div');
    groundRing.className = 'marker-ground-ring';
    groundRing.style.borderColor = userColor;

    const groundPulse = document.createElement('div');
    groundPulse.className = 'marker-ground-pulse';
    groundPulse.style.borderColor = userColor;

    groundPoint.appendChild(groundRing);
    groundPoint.appendChild(groundPulse);
    groundPoint.appendChild(groundDot);

    // Assemble components in vertical stack: Billboard -> Stem -> Needle Tip -> Ground Point
    anchor.appendChild(billboard);
    anchor.appendChild(stem);
    anchor.appendChild(needleTip);
    anchor.appendChild(groundPoint);

    // Marker click event: fly to street level and open action menu
    anchor.addEventListener('click', (e) => {
      e.stopPropagation();
      this.focusUser(user, 16.5);
      if (this.onUserClickCallback) {
        this.onUserClickCallback(user);
      }
    });

    return anchor;
  }

  updateMarkerElement(anchor, user) {
    const isMe = user.id === this.currentUserId;
    const isInCall = user.status === 'IN_CALL';
    const userColor = user.color || getUserColor(user.id);

    const billboard = anchor.querySelector('.marker-billboard');
    if (billboard) {
      billboard.style.borderColor = userColor;
      billboard.style.boxShadow = `0 6px 20px rgba(0, 0, 0, 0.7), 0 0 12px ${userColor}55`;
    }

    const dot = anchor.querySelector('.marker-status-dot');
    if (dot) {
      dot.className = `marker-status-dot ${isInCall ? 'in-call' : ''}`;
      dot.style.backgroundColor = userColor;
      dot.style.boxShadow = `0 0 6px ${userColor}`;
    }

    const stem = anchor.querySelector('.marker-pin-stem');
    if (stem) {
      stem.style.background = `linear-gradient(to top, ${userColor}, rgba(255, 255, 255, 0.4), transparent)`;
      stem.style.boxShadow = `0 0 6px ${userColor}`;
    }

    const needleTip = anchor.querySelector('.marker-needle-tip');
    if (needleTip) {
      needleTip.style.borderTopColor = userColor;
    }

    const groundDot = anchor.querySelector('.marker-ground-dot');
    if (groundDot) {
      groundDot.style.backgroundColor = userColor;
      groundDot.style.boxShadow = `0 0 10px ${userColor}`;
    }

    const groundRing = anchor.querySelector('.marker-ground-ring');
    if (groundRing) {
      groundRing.style.borderColor = userColor;
    }

    const groundPulse = anchor.querySelector('.marker-ground-pulse');
    if (groundPulse) {
      groundPulse.style.borderColor = userColor;
    }

    const locSpan = anchor.querySelector('.marker-location');
    if (locSpan) {
      locSpan.textContent = `${user.city || 'World'}`;
    }

    const genderBadge = anchor.querySelector('.marker-gender-badge');
    if (genderBadge) {
      const isFemale = (user.gender || '').toUpperCase() === 'FEMALE';
      genderBadge.className = `marker-gender-badge ${isFemale ? 'female' : 'male'}`;
      genderBadge.textContent = `${isFemale ? '♀' : '♂'} ${user.age || 24}`;
    }
  }

  setCurrentUserId(id) {
    this.currentUserId = id;
    if (this.users.length > 0) {
      this.updateUsers(this.users);
    }
  }

  /**
   * Update 3D geodesic curved connection arcs
   */
  updateLinks(linkList) {
    this.links = linkList || [];
    this.updateArcsSource();
  }

  updateArcsSource() {
    if (!this.map || !this.map.getSource('connection-arcs')) return;

    const features = [];

    this.links.forEach(link => {
      try {
        if (link.isLoveLink || link.loveLink) {
          // Condition: When user is male, send Cupid Love Arrow to female user instead of showing line!
          this.triggerLoveAnimationForLink(link);
          return;
        }

        const start = [link.user1Lng, link.user1Lat];
        const end = [link.user2Lng, link.user2Lat];

        const arcColor = getLinkColor(link);
        // Generate geodesic Great Circle line with Turf.js
        if (window.turf && window.turf.greatCircle) {
          const arc = window.turf.greatCircle(start, end, {
            npoints: 100,
            properties: {
              color: arcColor,
              type: link.type
            }
          });
          features.push(arc);
        } else {
          // Fallback straight line
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [start, end]
            },
            properties: {
              color: arcColor,
              type: link.type
            }
          });
        }
      } catch (e) {
        console.warn('Could not generate arc for link:', link, e);
      }
    });

    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    const source = this.map.getSource('connection-arcs');
    if (source) {
      source.setData(geojson);
    }
  }

  /**
   * Trigger love animation for a link
   */
  triggerLoveAnimationForLink(link) {
    if (!this.playedLoveLinks) this.playedLoveLinks = new Set();
    if (this.playedLoveLinks.has(link.id)) return;
    this.playedLoveLinks.add(link.id);

    const user1 = (this.users || []).find(u => u.id === link.user1Id) || {
      id: link.user1Id,
      name: link.user1Name,
      lat: link.user1Lat,
      lng: link.user1Lng,
      gender: link.user1Gender || 'MALE'
    };

    const user2 = (this.users || []).find(u => u.id === link.user2Id) || {
      id: link.user2Id,
      name: link.user2Name,
      lat: link.user2Lat,
      lng: link.user2Lng,
      gender: link.user2Gender || 'FEMALE'
    };

    const u1Gender = (user1.gender || 'MALE').toUpperCase();
    const u2Gender = (user2.gender || 'FEMALE').toUpperCase();
    if ((u1Gender === 'MALE' && u2Gender === 'FEMALE') || (u1Gender === 'FEMALE' && u2Gender === 'MALE')) {
      this.triggerLoveAnimation(user1, user2);
    }
  }

  /**
   * Dynamic Cupid Love Arrow & Blushing Mermaid Animation
   * Only allowed between Female and Male (Female -> Male OR Male -> Female)
   * Female shows Blushing Mermaid after receiving OR sending arrow
   * Male shows Love Impact (hearts burst), NEVER mermaid
   */
  triggerLoveAnimation(senderUser, targetUser) {
    if (!this.map || !senderUser || !targetUser) return;

    const senderGender = (senderUser.gender || 'MALE').toUpperCase();
    const targetGender = (targetUser.gender || 'FEMALE').toUpperCase();

    // Condition Check: Only Female-Male or Male-Female allowed
    const isMaleToFemale = senderGender === 'MALE' && targetGender === 'FEMALE';
    const isFemaleToMale = senderGender === 'FEMALE' && targetGender === 'MALE';
    if (!isMaleToFemale && !isFemaleToMale) {
      console.warn('Love interaction ignored: only allowed between female and male');
      return;
    }

    // Fixed camera perspective: Ensure the globe does not auto-spin while Cupid shoots
    this.stopAutoSpin();

    let fromLng = senderUser.lng;
    while (fromLng < -180) fromLng += 360;
    while (fromLng > 180) fromLng -= 360;

    let toLng = targetUser.lng;
    while (toLng < -180) toLng += 360;
    while (toLng > 180) toLng -= 360;

    // 1. Calculate Geodesic Flight Path from Sender to Target
    let arcPoints = [[fromLng, senderUser.lat], [toLng, targetUser.lat]];
    if (window.turf && window.turf.greatCircle) {
      try {
        const gc = window.turf.greatCircle([fromLng, senderUser.lat], [toLng, targetUser.lat], { npoints: 60 });
        if (gc && gc.geometry && gc.geometry.coordinates) {
          arcPoints = gc.geometry.coordinates;
        }
      } catch (e) {
        console.warn('Great circle flight calculation fallback:', e);
      }
    }

    // 2. Spawn Animated Cupid Marker at Sender Location
    const cupidEl = document.createElement('div');
    cupidEl.className = 'cosmic-cupid-sprite cupid-fly-marker';
    cupidEl.innerHTML = `
      <div class="cupid-inner">
        <div class="cupid-halo"></div>
        <img src="/images/cupid.jpg" alt="Cupid">
      </div>
    `;

    const cupidMarker = new maplibregl.Marker({
      element: cupidEl,
      anchor: 'bottom',
      offset: [0, -45]
    })
    .setLngLat([fromLng, senderUser.lat])
    .addTo(this.map);

    // 3. Spawn Animated Love Arrow Marker at start of path
    const arrowEl = document.createElement('div');
    arrowEl.className = 'love-arrow-marker';
    arrowEl.innerHTML = `
      <div class="love-arrow-wrap">
        <div class="love-arrow-sparkles">💖✨</div>
        <svg class="love-arrow-svg" viewBox="0 0 60 60" fill="none">
          <line x1="5" y1="30" x2="45" y2="30" stroke="#ffd700" stroke-width="4" stroke-linecap="round"/>
          <path d="M40 20 L55 30 L40 40 Z" fill="#ff007f" filter="drop-shadow(0 0 8px #ff007f)"/>
          <circle cx="48" cy="30" r="5" fill="#ffffff" opacity="0.9"/>
        </svg>
      </div>
    `;

    const arrowMarker = new maplibregl.Marker({
      element: arrowEl,
      anchor: 'center'
    })
    .setLngLat(arcPoints[0])
    .addTo(this.map);

    // Announce banner globally
    this.showLoveBanner(`💘 ${senderUser.name} shot Love Arrow to ${targetUser.name}! 🧜‍♀️✨`);

    // "only show mermaid if the user is female after recieving or senind arrow"
    // If sender is female: show Blushing Mermaid at female sender location after sending arrow!
    if (senderGender === 'FEMALE') {
      setTimeout(() => {
        const inner = cupidEl.querySelector('.cupid-inner');
        if (inner) {
          inner.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          inner.style.opacity = '0';
          inner.style.transform = 'scale(0.5)';
        }
        setTimeout(() => cupidMarker.remove(), 600);
        this.spawnBlushingMermaid(senderUser);
      }, 500);
    }

    // 4. Animate Arrow along Geodesic Path
    const totalPoints = arcPoints.length;
    const durationMs = 2800;
    const startTime = performance.now();

    const animateArrow = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      const currentIndex = Math.floor(progress * (totalPoints - 1));
      const currentPoint = arcPoints[currentIndex];

      if (currentPoint) {
        arrowMarker.setLngLat(currentPoint);

        // Orient arrow along flight direction
        if (currentIndex < totalPoints - 1) {
          const nextPoint = arcPoints[currentIndex + 1];
          const p1 = this.map.project(currentPoint);
          const p2 = this.map.project(nextPoint);
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          if (Math.hypot(dx, dy) > 0.5) {
            const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
            const wrap = arrowEl.querySelector('.love-arrow-wrap');
            if (wrap) wrap.style.transform = `rotate(${angleDeg}deg)`;
          }
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateArrow);
      } else {
        // Arrow arrived at Target destination!
        arrowMarker.remove();

        // If Cupid is still at sender (e.g. Male sender), fade out smoothly
        if (senderGender === 'MALE') {
          setTimeout(() => {
            const inner = cupidEl.querySelector('.cupid-inner');
            if (inner) {
              inner.style.transition = 'opacity 1s ease, transform 1s ease';
              inner.style.opacity = '0';
              inner.style.transform = 'scale(0.5)';
            }
            setTimeout(() => cupidMarker.remove(), 1000);
          }, 800);
        }

        // Handle target arrival:
        // "only show mermaid if the user is female after recieving or senind arrow"
        if (targetGender === 'FEMALE') {
          // Female target received arrow -> Blushing Mermaid!
          this.spawnBlushingMermaid(targetUser);
        } else {
          // Male target received arrow -> Love Heart impact (NEVER mermaid)
          this.spawnMaleLoveImpact(targetUser);
        }
      }
    };

    // Delay slightly to let Cupid draw bow before arrow flies
    setTimeout(() => {
      requestAnimationFrame(animateArrow);
    }, 450);
  }

  /**
   * Spawn Love Impact at Male Location with glowing heart burst (NO mermaid)
   */
  spawnMaleLoveImpact(maleUser) {
    if (!this.map || !maleUser) return;

    let maleLng = maleUser.lng;
    while (maleLng < -180) maleLng += 360;
    while (maleLng > 180) maleLng -= 360;

    const impactEl = document.createElement('div');
    impactEl.className = 'male-love-impact-marker';
    impactEl.innerHTML = `
      <div class="male-love-inner">
        <div class="male-love-burst"></div>
        <div class="male-love-hearts">
          <span>💖</span>
          <span>💘</span>
          <span>✨</span>
        </div>
      </div>
    `;

    const impactMarker = new maplibregl.Marker({
      element: impactEl,
      anchor: 'center',
      offset: [0, -35]
    })
    .setLngLat([maleLng, maleUser.lat])
    .addTo(this.map);

    setTimeout(() => {
      impactEl.style.transition = 'opacity 0.6s ease';
      impactEl.style.opacity = '0';
      setTimeout(() => impactMarker.remove(), 600);
    }, 2400);
  }

  /**
   * Spawn Blushing Mermaid at Female Location with rosy cheeks and floating bubble hearts
   */
  spawnBlushingMermaid(femaleUser) {
    if (!this.map || !femaleUser) return;

    let femaleLng = femaleUser.lng;
    while (femaleLng < -180) femaleLng += 360;
    while (femaleLng > 180) femaleLng -= 360;

    const mermaidEl = document.createElement('div');
    mermaidEl.className = 'cosmic-mermaid-sprite mermaid-blush-marker';
    mermaidEl.innerHTML = `
      <div class="mermaid-inner">
        <img src="/images/mermaid-blush.jpg" alt="Blushing Mermaid">
        <div class="mermaid-blush-glow"></div>
        <div class="mermaid-bubble-hearts">
          <span class="bubble-heart">💕</span>
          <span class="bubble-heart">💖</span>
          <span class="bubble-heart">🫧</span>
        </div>
      </div>
    `;

    const mermaidMarker = new maplibregl.Marker({
      element: mermaidEl,
      anchor: 'bottom',
      offset: [0, -45]
    })
    .setLngLat([femaleLng, femaleUser.lat])
    .addTo(this.map);

    // Keep Mermaid blushing for 7 seconds, then fade out
    setTimeout(() => {
      const inner = mermaidEl.querySelector('.mermaid-inner');
      if (inner) {
        inner.style.transition = 'opacity 1.5s ease, transform 1.5s ease';
        inner.style.opacity = '0';
        inner.style.transform = 'scale(0.6)';
      }
      setTimeout(() => mermaidMarker.remove(), 1500);
    }, 7000);
  }

  /**
   * Floating Love Announcement Banner
   */
  showLoveBanner(text) {
    const existing = document.querySelector('.love-announcement-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'love-announcement-banner';
    banner.innerHTML = `<span>${text}</span>`;
    document.body.appendChild(banner);

    setTimeout(() => {
      if (banner.parentNode) banner.remove();
    }, 4200);
  }

  zoomIn() {
    if (this.map) this.map.zoomIn({ duration: 400 });
  }

  zoomOut() {
    if (this.map) this.map.zoomOut({ duration: 400 });
  }
}

window.GlobeManager = GlobeManager;
