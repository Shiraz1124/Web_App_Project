
const OpenAI = require('openai');
const axios = require('axios');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const findAccurateLandscapes = async (startPoint, tripType, routeCoordinates = []) => {
  try {
    console.log(`🎯 Finding landscapes near ${startPoint} for ${tripType} trip`);

    // STEP 1: Ask AI for creative suggestions
    const aiSuggestions = await getAISuggestions(startPoint, tripType);
    console.log(`🤖 AI suggested ${aiSuggestions.length} places`);

    // STEP 2: Verify with Google Maps
    const verifiedPlaces = await verifyWithGoogleMaps(aiSuggestions);
    console.log(`✅ Verified ${verifiedPlaces.length} real places`);

    // STEP 3: Find additional places from Google
    const googlePlaces = await findGooglePlaces(startPoint, tripType);
    console.log(`🗺️ Google found ${googlePlaces.length} additional places`);

    // STEP 4: Combine and remove duplicates FIRST
    const allPlaces = [...verifiedPlaces, ...googlePlaces];
    const uniquePlaces = removeDuplicates(allPlaces);
    console.log(`🔄 Removed duplicates: ${allPlaces.length} → ${uniquePlaces.length} unique places`);
    
    // STEP 5: Filter by distance from route
    const filteredPlaces = routeCoordinates.length > 0 
      ? filterPlacesByRouteDistance(uniquePlaces, routeCoordinates, 0.5)
      : uniquePlaces.slice(0, tripType === 'bike' ? 4 : 3);
    
    const finalPlaces = filteredPlaces.slice(0, tripType === 'bike' ? 4 : 3);

    console.log(`🎉 Final result: ${finalPlaces.length} landscapes within 0.5km of route`);
    
    // DEBUG: Log final place names to check for duplicates
    console.log(`📋 Final places: ${finalPlaces.map(p => p.name).join(', ')}`);
    
    return finalPlaces;

  } catch (error) {
    console.error('Landscape discovery failed:', error);
    return [];
  }
};

/**
 * STEP 1: Get AI suggestions
 */
const getAISuggestions = async (startPoint, tripType) => {
  const activityType = tripType === 'bike' ? 'cycling' : 'walking';
  
  const prompt = `List 6 DIFFERENT real scenic places near ${startPoint} suitable for ${activityType}.

Requirements:
- Real places that exist (not fictional)
- DIFFERENT types: parks, viewpoints, historical sites, beaches, etc.
- NO DUPLICATES - each place must be unique
- Mix of viewpoints, parks, landmarks, historical sites
- Within 5km of ${startPoint}
- Variety is important - avoid listing the same place multiple times

Return ONLY JSON array:
[
  {
    "name": "Exact unique place name",
    "type": "viewpoint",
    "description": "Short description",
    "coordinates": [latitude, longitude]
  }
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Return only valid JSON arrays. Be factual about real places. Ensure all places are DIFFERENT and unique." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7, // Increased for more variety
      max_tokens: 600,
    });

    const suggestions = JSON.parse(completion.choices[0].message.content.trim());
    
    // Filter out invalid suggestions
    const validSuggestions = suggestions.filter(place => 
      place.name && 
      place.coordinates && 
      Array.isArray(place.coordinates) && 
      place.coordinates.length === 2
    );

    console.log(`🤖 AI suggested ${validSuggestions.length} unique places:`, validSuggestions.map(p => p.name));
    return validSuggestions;

  } catch (error) {
    console.warn('AI suggestions failed:', error);
    return [];
  }
};

/**
 * STEP 2: Verify AI suggestions with Google Maps
 */
const verifyWithGoogleMaps = async (aiSuggestions) => {
  const verified = [];

  for (const suggestion of aiSuggestions.slice(0, 4)) { // Limit to 4 to avoid too many API calls
    try {
      // Search for the place using Google Text Search
      const searchResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/place/textsearch/json',
        {
          params: {
            query: suggestion.name,
            key: process.env.GOOGLE_MAPS_API_KEY,
            language: 'en'
          }
        }
      );

      if (searchResponse.data.status === 'OK' && searchResponse.data.results.length > 0) {
        const place = searchResponse.data.results[0]; // Take the best match
        
        verified.push({
          name: place.name,
          type: suggestion.type || 'viewpoint',
          description: suggestion.description || `Popular attraction with ${place.rating || 'good'} rating`,
          coordinates: [place.geometry.location.lat, place.geometry.location.lng],
          suggestedStopMinutes: 25,
          distanceFromRouteKm: 1, // Approximate
          rating: place.rating || null,
          source: 'ai_verified'
        });

        console.log(`✅ Verified: ${place.name}`);
      } else {
        console.log(`❌ Not found: ${suggestion.name}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.warn(`Failed to verify ${suggestion.name}:`, error.message);
    }
  }

  return verified;
};

/**
 * STEP 3: Find additional places using Google Places
 */
const findGooglePlaces = async (startPoint, tripType) => {
  try {
    // First, get coordinates for the start point
    const geocodeResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: startPoint,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (geocodeResponse.data.status !== 'OK' || geocodeResponse.data.results.length === 0) {
      console.warn('Could not geocode start point for Google Places search');
      return [];
    }

    const location = geocodeResponse.data.results[0].geometry.location;
    
    // Search for nearby attractions
    const placesResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${location.lat},${location.lng}`,
          radius: tripType === 'bike' ? 3000 : 2000, // 3km for bike, 2km for walking
          type: 'tourist_attraction',
          key: process.env.GOOGLE_MAPS_API_KEY,
          language: 'en'
        }
      }
    );

    if (placesResponse.data.status === 'OK') {
      const googleResults = placesResponse.data.results
        .filter(place => place.rating >= 4.0) // Only good ratings
        .slice(0, 3) // Limit to 3
        .map(place => ({
          name: place.name,
          type: 'historic_site',
          description: `Popular tourist attraction with ${place.rating}⭐ rating`,
          coordinates: [place.geometry.location.lat, place.geometry.location.lng],
          suggestedStopMinutes: 30,
          distanceFromRouteKm: 1, // Approximate
          rating: place.rating,
          source: 'google_places'
        }));
      
      console.log(`🗺️ Google Places found: ${googleResults.map(p => p.name).join(', ')}`);
      return googleResults;
    }

    return [];

  } catch (error) {
    console.warn('Google Places search failed:', error);
    return [];
  }
};

/**
 * STEP 4: Remove duplicates
 */
const removeDuplicates = (places) => {
  console.log(`🔍 Checking for duplicates in ${places.length} places...`);
  
  const unique = [];
  const seen = new Set();

  for (const place of places) {
    // Create multiple keys to catch different types of duplicates
    const nameKey = place.name.toLowerCase()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[^\w]/g, ''); // Remove special characters
    
    // Also check for coordinate-based duplicates (same location)
    const coordKey = place.coordinates ? 
      `${Math.round(place.coordinates[0] * 1000)},${Math.round(place.coordinates[1] * 1000)}` : 
      null;
    
    // Check if we've seen this place name or coordinates before
    const isDuplicateName = seen.has(`name:${nameKey}`);
    const isDuplicateCoord = coordKey && seen.has(`coord:${coordKey}`);
    
    if (!isDuplicateName && !isDuplicateCoord) {
      // Mark this name and coordinates as seen
      seen.add(`name:${nameKey}`);
      if (coordKey) {
        seen.add(`coord:${coordKey}`);
      }
      
      unique.push(place);
      console.log(`✅ Added unique place: ${place.name}`);
    } else {
      console.log(`🚫 Skipped duplicate: ${place.name} (${isDuplicateName ? 'name' : 'coordinates'} match)`);
    }
  }

  // Sort by rating (higher first), then by source preference
  const sorted = unique.sort((a, b) => {
    // Prefer verified places over google places
    if (a.source === 'ai_verified' && b.source === 'google_places') return -1;
    if (a.source === 'google_places' && b.source === 'ai_verified') return 1;
    
    // Then sort by rating
    return (b.rating || 0) - (a.rating || 0);
  });

  console.log(`🔄 Duplicate removal: ${places.length} → ${sorted.length} unique places`);
  return sorted;
};

/**
 * STEP 5: Filter places by distance from route
 */
const filterPlacesByRouteDistance = (places, routeCoordinates, maxDistanceKm) => {
  console.log(`📏 Filtering ${places.length} places by ${maxDistanceKm}km distance from route`);
  
  if (!routeCoordinates || routeCoordinates.length === 0) {
    console.log(`⚠️ No route coordinates provided, returning all places`);
    return places;
  }
  
  const filteredPlaces = places.filter(place => {
    if (!place.coordinates || place.coordinates.length !== 2) {
      console.log(`❌ ${place.name}: Invalid coordinates`);
      return false;
    }
    
    const [placeLat, placeLng] = place.coordinates;
    
    // Find minimum distance from place to any point on the route
    let minDistance = Infinity;
    
    for (const [routeLat, routeLng] of routeCoordinates) {
      const distance = calculateDistance(placeLat, placeLng, routeLat, routeLng);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    const isWithinRange = minDistance <= maxDistanceKm;
    
    if (isWithinRange) {
      place.distanceFromRouteKm = Math.round(minDistance * 100) / 100;
      console.log(`✅ ${place.name}: ${place.distanceFromRouteKm}km from route`);
    } else {
      console.log(`❌ ${place.name}: ${Math.round(minDistance * 100) / 100}km from route (too far)`);
    }
    
    return isWithinRange;
  });
  
  // Sort by distance from route (closest first)
  filteredPlaces.sort((a, b) => a.distanceFromRouteKm - b.distanceFromRouteKm);
  
  console.log(`📍 Kept ${filteredPlaces.length} places within ${maxDistanceKm}km of route`);
  return filteredPlaces;
};

/**
 * Distance calculation using Haversine formula
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

module.exports = {
  findAccurateLandscapes
};