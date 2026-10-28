/**
 * Fast, lightweight reverse geocoding with in-memory caching
 * Resolves GPS coordinates [lat, lon] to formatted location e.g. "San Francisco, CA" or "Bengaluru, Karnataka"
 */

const geocodeCache = new Map<string, string>();

export async function reverseGeocodeCoords(lat: number, lon: number): Promise<string | undefined> {
  if (isNaN(lat) || isNaN(lon) || (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001)) {
    return undefined;
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // 1. Primary: OpenStreetMap Nominatim (Accurate landmark, village, and trail recognition)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const isBrowser = typeof window !== 'undefined';
    const fetchHeaders: Record<string, string> = {};
    if (!isBrowser) {
      fetchHeaders['User-Agent'] = 'RunCraft-WorkoutStudio/1.0 (https://github.com/nmanjuonline/run-craft)';
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: fetchHeaders,
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data: any = await res.json();
      const addr = data.address || {};

      // Hierarchical place detection:
      // 1. Primary municipality (city or town)
      let place = addr.city || addr.town;

      // 2. District / Metropole fallback (e.g. Mumbai where city is omitted in OSM and placed in state_district)
      if (!place) {
        if (addr.state_district && /mumbai/i.test(addr.state_district)) {
          place = 'Mumbai';
        } else if (addr.village) {
          place = addr.village;
        } else if (addr.suburb) {
          place = addr.suburb;
        } else if (addr.municipality || addr.county || addr.hamlet) {
          place = addr.municipality || addr.county || addr.hamlet;
        }
      }

      // 3. Landmark / Shrine / Natural reserve recognition (e.g. Sabarimala, Yosemite, Nandi Hills)
      if (data.name && /sabarimala/i.test(data.name)) {
        place = 'Sabarimala';
      } else if (data.display_name && /sabarimala/i.test(data.display_name)) {
        place = 'Sabarimala';
      }

      const state = addr.state || addr.country;
      if (place && state && place.toLowerCase() !== state.toLowerCase()) {
        const result = `${place}, ${state}`;
        geocodeCache.set(cacheKey, result);
        return result;
      } else if (place) {
        // Handle cases where city and state are identical (e.g. New York, New York -> New York, NY)
        const stateCode = addr['ISO3166-2-lvl4']?.split('-')[1];
        const result = stateCode
          ? `${place}, ${stateCode}`
          : addr.country && addr.country.toLowerCase() !== place.toLowerCase()
          ? `${place}, ${addr.country}`
          : place;
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {}

  // 2. Secondary / Fallback: BigDataCloud client-free reverse geocoding API
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data: any = await res.json();
      const city = data.locality || data.city || data.principalSubdivision;
      const region = data.principalSubdivision || data.countryName;
      if (city && region && city.toLowerCase() !== region.toLowerCase()) {
        const result = `${city}, ${region}`;
        geocodeCache.set(cacheKey, result);
        return result;
      } else if (city) {
        const result = data.countryName ? `${city}, ${data.countryName}` : city;
        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {}

  return undefined;
}
