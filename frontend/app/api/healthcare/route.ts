import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');

    if (!location) {
      return NextResponse.json({ error: 'Missing location parameter' }, { status: 400 });
    }

    // 1. Geocode location using OpenStreetMap Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location
    )}&format=json&limit=1&countrycodes=in`;

    const geocodeRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'AarogyamHealthAccessAgent/1.0 (contact: support@aarogyam.ai)',
      },
    });

    if (!geocodeRes.ok) {
      return NextResponse.json({ error: 'Geocoding request failed' }, { status: 502 });
    }

    const geocodeData = await geocodeRes.json();
    if (!geocodeData || geocodeData.length === 0) {
      return NextResponse.json({ error: `Could not locate '${location}' in India.` }, { status: 404 });
    }

    const first = geocodeData[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    const displayName = first.display_name;

    // 2. Fetch nearby hospitals, clinics, and doctors within 5km radius using Overpass API
    const overpassQuery = `[out:json][timeout:15];
(
  nwr["amenity"="hospital"](around:5000,${lat},${lon});
  nwr["amenity"="clinic"](around:5000,${lat},${lon});
  nwr["amenity"="doctors"](around:5000,${lat},${lon});
);
out body;`;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const overpassRes = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'AarogyamHealthAccessAgent/1.0 (contact: support@aarogyam.ai)',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!overpassRes.ok) {
      return NextResponse.json({ error: 'Healthcare facilities search failed' }, { status: 502 });
    }

    const overpassData = await overpassRes.json();
    const elements = overpassData.elements || [];
    const facilities: any[] = [];

    // Helper function for great-circle distance calculation
    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Earth radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    for (const elem of elements) {
      const tags = elem.tags || {};
      const name = tags.name;
      if (!name) continue;

      let elemLat = elem.lat;
      let elemLon = elem.lon;

      if (elemLat === undefined || elemLon === undefined) {
        if (elem.center) {
          elemLat = elem.center.lat;
          elemLon = elem.center.lon;
        }
      }

      if (elemLat === undefined || elemLon === undefined) continue;

      const dist = haversineDistance(lat, lon, elemLat, elemLon);

      const addrParts: string[] = [];
      ['addr:street', 'addr:suburb', 'addr:city', 'addr:postcode'].forEach((tagKey) => {
        if (tags[tagKey]) {
          addrParts.push(tags[tagKey]);
        }
      });
      const address = addrParts.length > 0 ? addrParts.join(', ') : 'Location details not available';

      facilities.push({
        name,
        type: (tags.amenity || 'healthcare_facility').replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        address,
        distance_km: Math.round(dist * 100) / 100,
        lat: elemLat,
        lon: elemLon,
      });
    }

    facilities.sort((a, b) => a.distance_km - b.distance_km);

    return NextResponse.json({
      status: 'success',
      location: displayName,
      coordinates: { lat, lon },
      facilities: facilities.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Error fetching healthcare facilities:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
