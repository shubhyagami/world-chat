/**
 * GeoLocation Utility for TerraChat 3D / OrbitSync
 * Handles HTML5 Geolocation with IP Fallback & City Presets
 */

const PRESET_CITIES = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lng: -21.9426 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 }
];

class GeoLocationService {
  constructor() {
    this.currentLocation = {
      lat: 35.6762,
      lng: 139.6503,
      city: 'Tokyo',
      country: 'Japan',
      source: 'Default'
    };
  }

  /**
   * Acquire location via GPS or IP
   */
  async acquireLocation() {
    // 1. Try HTML5 Geolocation API
    try {
      const pos = await this.getBrowserGps();
      this.currentLocation.lat = pos.coords.latitude;
      this.currentLocation.lng = pos.coords.longitude;
      this.currentLocation.source = 'GPS';

      // Reverse geocode or fetch city from IP for friendly name
      try {
        const ipInfo = await this.getIpLocation();
        this.currentLocation.city = ipInfo.city || 'My Location';
        this.currentLocation.country = ipInfo.country_name || ipInfo.country || 'Global';
      } catch (e) {
        this.currentLocation.city = 'GPS Position';
        this.currentLocation.country = 'Live';
      }

      return this.currentLocation;
    } catch (gpsError) {
      console.warn('GPS unavailable, falling back to IP Geolocation:', gpsError.message);
    }

    // 2. Fallback to IP Geolocation
    try {
      const ipInfo = await this.getIpLocation();
      if (ipInfo && ipInfo.latitude && ipInfo.longitude) {
        this.currentLocation.lat = parseFloat(ipInfo.latitude);
        this.currentLocation.lng = parseFloat(ipInfo.longitude);
        this.currentLocation.city = ipInfo.city || 'Local City';
        this.currentLocation.country = ipInfo.country_name || ipInfo.country || 'Global';
        this.currentLocation.source = 'IP';
        return this.currentLocation;
      }
    } catch (ipError) {
      console.warn('IP Geolocation failed, picking a randomized preset:', ipError.message);
    }

    // 3. Fallback: random city from preset list
    const randomCity = PRESET_CITIES[Math.floor(Math.random() * PRESET_CITIES.length)];
    // Add tiny jitter so two users in same city don't overlap completely
    const jitterLat = (Math.random() - 0.5) * 0.5;
    const jitterLng = (Math.random() - 0.5) * 0.5;

    this.currentLocation = {
      lat: randomCity.lat + jitterLat,
      lng: randomCity.lng + jitterLng,
      city: randomCity.name,
      country: randomCity.country,
      source: 'Preset'
    };

    return this.currentLocation;
  }

  getBrowserGps() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000
      });
    });
  }

  async getIpLocation() {
    // Try ipapi.co
    try {
      const res = await fetch('https://ipapi.co/json/', { timeout: 4000 });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Ignore and fallback
    }

    // Secondary fallback: ipwhois
    const res2 = await fetch('https://ipwho.is/');
    if (res2.ok) {
      const data = await res2.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country_name: data.country
      };
    }
    throw new Error('All IP services failed');
  }

  /**
   * Set manual teleport coordinates
   */
  teleport(cityName) {
    const city = PRESET_CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    if (city) {
      const jitterLat = (Math.random() - 0.5) * 0.2;
      const jitterLng = (Math.random() - 0.5) * 0.2;

      this.currentLocation = {
        lat: city.lat + jitterLat,
        lng: city.lng + jitterLng,
        city: city.name,
        country: city.country,
        source: 'Teleported'
      };
      return this.currentLocation;
    }
    return null;
  }

  /**
   * Calculate distance in kilometers between two points using Haversine formula
   */
  static getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}

window.GeoLocationService = GeoLocationService;
window.PRESET_CITIES = PRESET_CITIES;
