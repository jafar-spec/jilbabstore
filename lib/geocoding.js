const GEO_CACHE_KEY = 'jilbabstore_geocache';

const getCache = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY)) || {};
  } catch (e) {
    return {};
  }
};

const saveCache = (cache) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
};

export const geocodeAddress = async (addressString) => {
  if (!addressString) return null;
  
  const cache = getCache();
  if (cache[addressString]) {
    // If it was cached as null previously (not found), we still return null
    if (cache[addressString] === 'NOT_FOUND') return null;
    return cache[addressString]; // Return cached {lat, lng}
  }

  try {
    // OpenStreetMap Nominatim Free Geocoding API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JilbabStoreAdminMap/1.0' // Nominatim requires a user agent
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
      
      // Save to cache
      cache[addressString] = result;
      saveCache(cache);
      
      // Artificial delay to respect Nominatim limits (1 request per second)
      await new Promise(r => setTimeout(r, 1000));
      
      return result;
    } else {
      cache[addressString] = 'NOT_FOUND';
      saveCache(cache);
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error("Geocoding failed for:", addressString, error);
  }
  
  return null;
};
