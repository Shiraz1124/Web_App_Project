// ==========================================
// AI SERVICE - CORE INTELLIGENCE LAYER
// ==========================================

require('dotenv').config(); 
const OpenAI = require('openai');
const axios = require('axios');
const { findAccurateLandscapes } = require('./landscapeService');

// OPENAI INITIALIZATION: Configure AI service for location resolution and route planning
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


/**
  * LOCATION RESOLUTION: Convert user input to specific city coordinates
 * PROBLEM: Users might enter "Israel" or "Italy" - we need specific cities
 * SOLUTION: Use AI to determine if input is country/city and resolve to major city
 * 
 * @param {string} location - User input (could be "Israel", "Rome", "France", etc.)
 * @returns {Promise<string>} - Specific city name
 */
const resolveLocationToCity = async (location) => {
  try {
    console.log(`🔍 Resolving location: "${location}"`);
    
    // INPUT VALIDATION: Ensure location is not empty
    const cleanLocation = location.trim();
    
    if (!cleanLocation) {
      throw new Error('Location cannot be empty');
    }
    
    // AI RESOLUTION: Use OpenAI to convert country/region to specific city
    const resolvedCity = await askOpenAIForCity(cleanLocation);
    
    console.log(`✅ Resolved to city: "${resolvedCity}"`);
    return resolvedCity;
    
  } catch (error) {
    console.error('❌ Location resolution failed:', error.message);
    throw new Error(`Failed to resolve location "${location}": ${error.message}`);
  }
};

/**
 * AI CITY RESOLVER: Use OpenAI to intelligently resolve location input
 * PROMPT ENGINEERING: Carefully crafted prompt for consistent results
 */
const askOpenAIForCity = async (location) => {
  // STRUCTURED PROMPT: Clear instructions with examples for AI consistency
  const prompt = `You are a geography expert.
INPUT: "${location}"

TASK: 
- If this is a COUNTRY name, return the name of a major, well-known city in that country (good for tourism/trips)
- If this is already a CITY name, return the same city name
- If this is a region/state, return a major city in that region

RULES:
- Return ONLY the city name, nothing else
- Use the most internationally known city name
- For countries like Israel → Tel Aviv, Italy → Rome, France → Paris, etc.
- For cities like "Jerusalem" → Jerusalem, "London" → London, etc.

EXAMPLES:
Input: "Israel" → Output: "Tel Aviv"
Input: "Italy" → Output: "Rome"
Input: "Rome" → Output: "Rome"
Input: "Jerusalem" → Output: "Jerusalem"
Input: "France" → Output: "Paris"
Input: "California" → Output: "Los Angeles"

INPUT: "${location}"
OUTPUT:`;

  try {
    // OPENAI API CALL: Use GPT for intelligent location resolution
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a geography expert. Return only city names, no explanations."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.1, // LOW TEMPERATURE: Consistent, deterministic results
      max_tokens: 50,   // SHORT RESPONSE: We only need city name
    });

    // RESPONSE PARSING: Clean up AI response
    const response = completion.choices[0].message.content.trim();
    const cityName = response.replace(/^(Output:|City:|Result:)\s*/i, '').trim();
    
    console.log(`🤖 OpenAI resolved "${location}" → "${cityName}"`);
    
    return cityName;
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to resolve location with AI');
  }
};


/**
 * GOOGLE MAPS INTEGRATION: Convert city name to precise coordinates
 * PURPOSE: Get latitude/longitude for mapping and route calculation
 * 
 * @param {string} cityName - Name of the city
 * @returns {Promise<{lat: number, lng: number, formattedAddress: string}>} - Coordinates and formatted address
 */
const getCityCoordinates = async (cityName) => {
  try {
    console.log(`🔍 Getting coordinates for: "${cityName}"`);
    
    // API KEY VALIDATION: Ensure Google Maps API key is configured
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not set in environment variables');
    }
    
    // GOOGLE GEOCODING API: Convert address to coordinates
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    
    const response = await axios.get(url, {
      params: {
        address: cityName,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    console.log(`🗺️ Google Maps API response status: ${response.data.status}`);
    
    // RESPONSE VALIDATION: Check if geocoding was successful
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const coordinates = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address
      };
      
      console.log(`✅ Coordinates found: ${coordinates.lat}, ${coordinates.lng}`);
      console.log(`📍 Formatted address: ${coordinates.formattedAddress}`);
      
      return coordinates;
    } else {
      throw new Error(`Google Maps API returned: ${response.data.status}`);
    }
    
  } catch (error) {
    console.error('❌ Coordinates lookup failed:', error.message);
    
    // ERROR HANDLING: Provide specific error messages for different API failures
    if (error.response?.data?.status) {
      const status = error.response.data.status;
      switch (status) {
        case 'REQUEST_DENIED':
          throw new Error('Google Maps API key is invalid or API is not enabled');
        case 'OVER_QUERY_LIMIT':
          throw new Error('Google Maps API quota exceeded');
        case 'ZERO_RESULTS':
          throw new Error(`No coordinates found for "${cityName}"`);
        default:
          throw new Error(`Google Maps API error: ${status}`);
      }
    }
    
    throw new Error(`Failed to get coordinates for "${cityName}": ${error.message}`);
  }
};


/**
 * Resolve location to city and get coordinates
 * 
 * @param {string} location - User input (country, city, region)
 * @returns {Promise<{city: string, coordinates: {lat: number, lng: number, formattedAddress: string}}>}
 */
const getLocationCoordinates = async (location) => {
  try {
    console.log(`🚀 Processing location: "${location}"`);
    
    // Step 1: Resolve to city name
    const cityName = await resolveLocationToCity(location);
    
    // Step 2: Get coordinates for the city
    const coordinates = await getCityCoordinates(cityName);
    
    const result = {
      originalInput: location,
      city: cityName,
      coordinates: coordinates
    };
    
    console.log(`🎉 Complete result:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ Full location processing failed:', error.message);
    throw error;
  }
};

/**
 * Find nearby cities within a certain radius for bicycle touring
 * 
 * @param {number} lat - Starting city latitude
 * @param {number} lng - Starting city longitude
 * @param {string} region - Region/country name for context
 * @param {number} maxDistance - Maximum distance in km (default: 60km for bikes)
 * @returns {Promise<Array>} - Array of nearby cities with coordinates
 */
const findNearbyCities = async (lat, lng, region, maxDistance = 60) => {
  const prompt = `You are a travel expert specializing in bicycle touring and walking routes.

TASK: Suggest 5-8 cities/towns near coordinates ${lat}, ${lng} in ${region} that are:
- Within approximately ${maxDistance}km radius
- Connected by scenic bicycle routes or good roads
- Interesting for tourists (historic, cultural, or natural attractions)
- Suitable as overnight stops

RULES:
- Return ONLY city names, one per line
- No explanations or descriptions
- Real cities that exist
- Mix of small towns and larger cities
- Consider cycling-friendly destinations

EXAMPLES for Tel Aviv area:
Herzliya
Netanya  
Caesarea
Hadera
Zichron Yaakov

EXAMPLES for Rome area:
Tivoli
Frascati
Castel Gandolfo
Anzio
Ostia

Region: ${region}
Coordinates: ${lat}, ${lng}
Max Distance: ${maxDistance}km

CITIES:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a travel expert. Return only city names, one per line, no other text."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = completion.choices[0].message.content.trim();
    const cityNames = response.split('\n')
      .map(city => city.trim())
      .filter(city => city.length > 0)
      .slice(0, 8); // Limit to 8 cities

    console.log(`🏙️ Found nearby cities:`, cityNames);
    
    // Get coordinates for each city
    const citiesWithCoords = [];
    for (const cityName of cityNames) {
      try {
        const coords = await getCityCoordinates(cityName);
        citiesWithCoords.push({
          name: cityName,
          ...coords
        });
      } catch (error) {
        console.warn(`⚠️ Could not get coordinates for ${cityName}, skipping`);
      }
    }
    
    return citiesWithCoords;
    
  } catch (error) {
    console.error('OpenAI API error for nearby cities:', error);
    throw new Error('Failed to find nearby cities');
  }
};

/**
 * Calculate route distance and duration using Google Maps Directions API
 * 
 * @param {number} startLat - Start latitude
 * @param {number} startLng - Start longitude  
 * @param {number} endLat - End latitude
 * @param {number} endLng - End longitude
 * @param {string} mode - Travel mode: 'bicycling' or 'walking'
 * @returns {Promise<{distance: string, duration: string, distanceValue: number, durationValue: number}>}
 */
const calculateRoute = async (startLat, startLng, endLat, endLng, mode = 'bicycling') => {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not set');
    }

    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    
    const response = await axios.get(url, {
      params: {
        origin: `${startLat},${startLng}`,
        destination: `${endLat},${endLng}`,
        mode: mode,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    // DEBUG: Log if we have routes
    console.log(`📊 ROUTES FOUND: ${response.data.routes?.length || 0}`);

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      // DEBUG: Log route structure
      console.log(`🛣️ ROUTE STRUCTURE:`);
      console.log(`   - Legs: ${route.legs.length}`);
      console.log(`   - Has overview_polyline: ${!!route.overview_polyline}`);
      console.log(`   - Has overview_polyline.points: ${!!route.overview_polyline?.points}`);
      
      
      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        distanceValue: leg.distance.value / 1000, // Convert to km
        durationValue: leg.duration.value / 3600,  // Convert to hours
        polyline: route.overview_polyline.points   // Encoded polyline for map display
      };
    } else {
      throw new Error(`Directions API error: ${response.data.status}`);
    }
    
  } catch (error) {
    console.error('❌ Route calculation failed:', error.message);
    throw error;
  }
};

/**
 * Generate circular walking routes that start and end at the same point
 * Strict retry logic - no fallbacks, throw error after 3 attempts
 * 
 * @param {number} lat - Starting point latitude
 * @param {number} lng - Starting point longitude
 * @param {string} cityName - City name for context
 * @param {number} targetDistance - Target distance in km (5-15km)
 * @param {number} attempt - Retry attempt counter (for recursion)
 * @returns {Promise<Object>} - Walking route information
 */
const generateCircularWalkingRoute = async (lat, lng, cityName, targetDistance = 10, attempt = 1) => {
  try {
    console.log(`🚶 Generating ${targetDistance}km circular walking route from ${cityName} (attempt ${attempt})`);
    
    // Throw error after 3 attempts - NO FALLBACKS
    if (attempt > 3) {
      throw new Error('Cannot generate walking trip, please try again');
    }
    
    // Create waypoints in a rough circle around the starting point
    const numWaypoints = Math.max(3, Math.min(8, Math.floor(targetDistance / 2)));
    const radius = (targetDistance / (2 * Math.PI)) * 1.2;
    
    const waypoints = [];
    for (let i = 0; i < numWaypoints; i++) {
      const angle = (2 * Math.PI * i) / numWaypoints;
      const waypointLat = lat + (radius / 111) * Math.cos(angle);
      const waypointLng = lng + (radius / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
      waypoints.push(`${waypointLat},${waypointLng}`);
    }
    
    // Get walking directions through waypoints back to start
    const url = 'https://maps.googleapis.com/maps/api/directions/json';
    
    const response = await axios.get(url, {
      params: {
        origin: `${lat},${lng}`,
        destination: `${lat},${lng}`,
        waypoints: waypoints.join('|'),
        mode: 'walking',
        optimize: true,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;
      const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 3600;
      
      console.log(`📏 Generated route distance: ${totalDistance.toFixed(1)}km`);
      
      // Validate distance and retry if needed - NO FALLBACKS
      if (totalDistance > 15) {
        console.log(`❌ Route too long (${totalDistance.toFixed(1)}km), retrying with shorter target...`);
        const newTarget = Math.min(targetDistance * 0.7, 12);
        return await generateCircularWalkingRoute(lat, lng, cityName, newTarget, attempt + 1);
      }
      
      if (totalDistance < 5) {
        console.log(`❌ Route too short (${totalDistance.toFixed(1)}km), retrying with longer target...`);
        const newTarget = Math.min(targetDistance * 1.4, 14);
        return await generateCircularWalkingRoute(lat, lng, cityName, newTarget, attempt + 1);
      }
      
      console.log(`✅ Route distance (${totalDistance.toFixed(1)}km) is within 5-15km range`);
      
      console.log(`🌄 Generating landscapes for ${cityName} walking route...`);

      const routeCoordinates = route.overview_polyline?.points 
        ? decodeGooglePolyline(route.overview_polyline.points)
        : [];

      const landscapes = await findAccurateLandscapes(
        cityName,
        'trek',
        routeCoordinates
      );
      console.log(`✅ Added ${landscapes.length} landscapes within 0.5km of walking route`);

      return {
        type: 'circular_walking',
        startLocation: cityName,
        totalDistance: `${totalDistance.toFixed(1)} km`,
        totalDuration: `${totalDuration.toFixed(1)} hours`,
        distanceValue: totalDistance,
        durationValue: totalDuration,
        waypoints: waypoints.length,
        polyline: route.overview_polyline.points,
        startCoords: { lat, lng },
        landscapes: landscapes,
        legs: route.legs.map((leg, index) => ({
          segment: index + 1,
          distance: leg.distance.text,
          duration: leg.duration.text,
          instructions: leg.steps.slice(0, 3).map(step => step.html_instructions)
        }))
      };
    } else {
      throw new Error(`Google Maps API returned: ${response.data.status}`);
    }
    
  } catch (error) {
    console.error(`❌ Circular walking route generation failed (attempt ${attempt}):`, error.message);
    
    // If this is the 3rd attempt, throw final error
    if (attempt >= 3) {
      throw new Error('Cannot generate walking trip, please try again');
    }
    
    // Otherwise, retry with different parameters
    const adjustedTarget = targetDistance + (Math.random() - 0.5) * 4; // ±2km variation
    const clampedTarget = Math.max(5, Math.min(15, adjustedTarget));
    
    console.log(`🔄 Retrying with adjusted target: ${clampedTarget.toFixed(1)}km`);
    return await generateCircularWalkingRoute(lat, lng, cityName, clampedTarget, attempt + 1);
  }
};

/**
 * Generate bicycle touring routes (city to city) for consecutive days
 * Strict retry logic - no fallbacks, throw error after 3 attempts
 * 
 * @param {string} startLocation - Starting location (country or city)
 * @param {number} days - Number of days (default: 2)
 * @param {number} maxDistancePerDay - Maximum km per day (default: 60)
 * @param {number} attempt - Retry attempt counter
 * @returns {Promise<Object>} - Bicycle touring route plan
 */
const generateBicycleRoutes = async (startLocation, days = 2, maxDistancePerDay = 60, attempt = 1) => {
  try {
    console.log(`🚴 Generating ${days}-day bicycle route from ${startLocation} (attempt ${attempt})`);
    
    // Throw error after 3 attempts - NO FALLBACKS
    if (attempt > 3) {
      throw new Error('Cannot generate bicycle trip, please try again');
    }
    
    // Step 1: Get starting city coordinates
    const startLocationData = await getLocationCoordinates(startLocation);
    const startCity = startLocationData.city;
    const startCoords = startLocationData.coordinates;
    
    // Step 2: Find nearby cities for touring
    const nearbyCities = await findNearbyCities(
      startCoords.lat, 
      startCoords.lng, 
      startLocationData.coordinates.formattedAddress.split(',').pop().trim(),
      maxDistancePerDay
    );
    
    if (nearbyCities.length < days - 1) {
      throw new Error(`Not enough nearby cities found for ${days}-day tour (found ${nearbyCities.length}, need ${days - 1})`);
    }
    
    // Step 3: Plan route through cities with strict distance validation
    const routePlan = {
      type: 'bicycle_touring',
      startLocation: startLocation,
      startCity: startCity,
      startCoords: startCoords,
      days: days,
      maxDistancePerDay: maxDistancePerDay,
      routes: []
    };
    
    let currentCoords = startCoords;
    let currentCity = startCity;
    const usedCities = [startCity];
    let successfulRoutes = 0;
    
    // Calculate routes for each day with strict validation
    for (let day = 1; day <= days; day++) {
      let routeFound = false;
      
      // Find available cities (not already used)
      const availableCities = nearbyCities.filter(city => 
        !usedCities.includes(city.name)
      );
      
      console.log(`🔍 Day ${day}: Available cities:`, availableCities.map(c => c.name));
      
      if (availableCities.length === 0) {
        console.error(`❌ No available cities for day ${day}`);
        break;
      }
      
      // Try different cities until we find one within distance limit
      for (let cityIndex = 0; cityIndex < availableCities.length && !routeFound; cityIndex++) {
        const candidateCity = availableCities[cityIndex];
        
        try {
          const route = await calculateRoute(
            currentCoords.lat,
            currentCoords.lng,
            candidateCity.lat,
            candidateCity.lng,
            'bicycling'
          );
          
          // Strict validation: route must be within limits
          if (route.distanceValue >= 25 && route.distanceValue <= maxDistancePerDay) {
            const routeCoordinates = route.polyline 
              ? decodeGooglePolyline(route.polyline)
              : [];

            console.log(`🌄 Generating landscapes for Day ${day} bike route...`);
            const landscapes = await findAccurateLandscapes(
              candidateCity.name,
              'bike',
              routeCoordinates
            );

            routePlan.routes.push({
              day: day,
              from: currentCity,
              to: candidateCity.name,
              distance: route.distance,
              duration: route.duration,
              distanceValue: route.distanceValue,
              durationValue: route.durationValue,
              polyline: route.polyline,
              feasible: true,
              landscapes: landscapes
            });

            console.log(`✅ Added ${landscapes.length} landscapes to Day ${day}`);
            
            // Update current position for next day
            currentCoords = { lat: candidateCity.lat, lng: candidateCity.lng };
            currentCity = candidateCity.name;
            usedCities.push(candidateCity.name);
            routeFound = true;
            successfulRoutes++;
            
            console.log(`✅ Day ${day}: ${routePlan.routes[routePlan.routes.length - 1].from} to ${candidateCity.name} - ${route.distanceValue.toFixed(1)}km`);
          } else if (route.distanceValue < 25) {
            console.log(`⚠️ Day ${day}: Route to ${candidateCity.name} too short (${route.distanceValue.toFixed(1)}km)`);
          } else {
            console.log(`⚠️ Day ${day}: Route to ${candidateCity.name} too long (${route.distanceValue.toFixed(1)}km)`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not calculate route to ${candidateCity.name}:`, error.message);
        }
      }
      
      // If no route found for this day, break the loop
      if (!routeFound) {
        console.error(`❌ No suitable route found for day ${day}`);
        break;
      }
    }
    
    // Validate that we have enough successful routes
    if (successfulRoutes < days) {
      throw new Error(`Only generated ${successfulRoutes} out of ${days} required routes`);
    }
    
    // Calculate totals
    routePlan.totalDistance = routePlan.routes.reduce((sum, route) => sum + route.distanceValue, 0);
    routePlan.totalDuration = routePlan.routes.reduce((sum, route) => sum + route.durationValue, 0);
    routePlan.feasible = routePlan.routes.every(route => route.feasible);
    
    // Generate description
    const aiDescription = await generateAccurateTripDescription(routePlan, 'bicycle');
    routePlan.description = aiDescription;
    
    console.log(`✅ Generated ${days}-day bicycle route with ${routePlan.routes.length} segments, total ${routePlan.totalDistance.toFixed(1)}km`);
    
    return routePlan;
    
  } catch (error) {
    console.error(`❌ Bicycle route generation failed (attempt ${attempt}):`, error.message);
    
    // If this is the 3rd attempt, throw final error
    if (attempt >= 3) {
      throw new Error('Cannot generate bicycle trip, please try again');
    }
    
    // Otherwise, retry with slightly different parameters
    const adjustedDistance = maxDistancePerDay + (Math.random() - 0.5) * 20; // ±10km variation
    const clampedDistance = Math.max(30, Math.min(80, adjustedDistance));
    
    console.log(`🔄 Retrying with adjusted max distance: ${clampedDistance.toFixed(1)}km`);
    return await generateBicycleRoutes(startLocation, days, clampedDistance, attempt + 1);
  }
};


/**
 * Generate walking routes (circular, 5-15km per day)
 * Strict retry logic - no fallbacks, throw error after 3 attempts
 * 
 * @param {string} startLocation - Starting location (country or city)
 * @param {number} days - Number of days
 * @param {number} targetDistancePerDay - Target distance per day (5-15km)
 * @param {number} attempt - Retry attempt counter
 * @returns {Promise<Object>} - Walking route plan
 */
const generateWalkingRoutes = async (startLocation, days = 1, targetDistancePerDay = 10, attempt = 1) => {
  try {
    console.log(`🚶 Generating ${days}-day walking routes from ${startLocation} (attempt ${attempt})`);
    
    // Throw error after 3 attempts - NO FALLBACKS
    if (attempt > 3) {
      throw new Error('Cannot generate walking trip, please try again');
    }
    
    // Validate and clamp target distance
    const clampedDistance = Math.max(5, Math.min(15, targetDistancePerDay));
    if (clampedDistance !== targetDistancePerDay) {
      console.log(`📏 Adjusted target distance from ${targetDistancePerDay}km to ${clampedDistance}km`);
    }
    
    // Step 1: Get starting city coordinates
    const startLocationData = await getLocationCoordinates(startLocation);
    const startCity = startLocationData.city;
    const startCoords = startLocationData.coordinates;
    
    // Step 2: Generate circular routes for each day
    const routePlan = {
      type: 'walking_tours',
      startLocation: startLocation,
      startCity: startCity,
      startCoords: startCoords,
      days: days,
      targetDistancePerDay: clampedDistance,
      routes: []
    };
    
    let successfulRoutes = 0;
    
    for (let day = 1; day <= days; day++) {
      try {
        // Vary the distance slightly for each day but keep within 5-15km range
        const dailyVariation = (Math.random() - 0.5) * 2; // ±1km variation
        const dailyDistance = Math.max(5, Math.min(15, clampedDistance + dailyVariation));
        
        const route = await generateCircularWalkingRoute(
          startCoords.lat,
          startCoords.lng,
          startCity,
          dailyDistance,
          1 // Reset attempt counter for each day
        );
        
        routePlan.routes.push({
          day: day,
          ...route,
          withinRange: route.distanceValue >= 5 && route.distanceValue <= 15
        });
        
        successfulRoutes++;
        console.log(`✅ Day ${day} walking route generated: ${route.distanceValue.toFixed(1)}km`);
        
      } catch (error) {
        console.error(`❌ Failed to generate walking route for day ${day}:`, error.message);
        // If we can't generate a route for any day, throw error
        throw new Error(`Failed to generate walking route for day ${day}: ${error.message}`);
      }
    }
    
    // Validate that we have all required routes
    if (successfulRoutes < days) {
      throw new Error(`Only generated ${successfulRoutes} out of ${days} required walking routes`);
    }
    
    // Calculate totals
    routePlan.totalDistance = routePlan.routes.reduce((sum, route) => sum + route.distanceValue, 0);
    routePlan.totalDuration = routePlan.routes.reduce((sum, route) => sum + route.durationValue, 0);
    routePlan.averageDistancePerDay = routePlan.totalDistance / days;

    // Generate description
    const aiDescription = await generateAccurateTripDescription(routePlan, 'walking');
    routePlan.description = aiDescription;
    
    console.log(`✅ Generated ${days}-day walking plan with average ${routePlan.averageDistancePerDay.toFixed(1)}km per day`);
    return routePlan;
    
  } catch (error) {
    console.error(`❌ Walking route generation failed (attempt ${attempt}):`, error.message);
    
    // If this is the 3rd attempt, throw final error
    if (attempt >= 3) {
      throw new Error('Cannot generate walking trip, please try again');
    }
    
    // Otherwise, retry with slightly different parameters
    const adjustedDistance = targetDistancePerDay + (Math.random() - 0.5) * 4; // ±2km variation
    const clampedDistance = Math.max(5, Math.min(15, adjustedDistance));
    
    console.log(`🔄 Retrying with adjusted target distance: ${clampedDistance.toFixed(1)}km`);
    return await generateWalkingRoutes(startLocation, days, clampedDistance, attempt + 1);
  }
};


/**
 * ROUTE GENERATION: Main function to generate bicycle or walking routes
 * ARCHITECTURE: Uses AI + Google Maps for intelligent route planning
 * 
 * @param {string} location - Starting location
 * @param {string} activityType - 'bicycle' or 'walking'
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Complete route plan
 */
const generateRoutes = async (location, activityType, options = {}) => {
  try {
    console.log(`🎯 Generating ${activityType} routes for ${location}`);
    
    // ROUTE TYPE LOGIC: Different generation strategies for different activities
    if (activityType === 'bicycle') {
      // BICYCLE ROUTES: Multi-day, city-to-city touring
      const days = Math.max(2, Math.min(7, options.days || 2));
      const maxDistancePerDay = Math.max(20, Math.min(100, options.maxDistancePerDay || 60));
      
      return await generateBicycleRoutes(location, days, maxDistancePerDay, 1);
      
    } else if (activityType === 'walking') {
      // WALKING ROUTES: Single-day, circular routes
      const days = Math.max(1, Math.min(7, options.days || 1));
      const targetDistancePerDay = Math.max(5, Math.min(15, options.targetDistancePerDay || 10));
      
      return await generateWalkingRoutes(location, days, targetDistancePerDay, 1);
      
    } else {
      throw new Error('Activity type must be "bicycle" or "walking"');
    }
    
  } catch (error) {
    console.error('❌ Route generation failed:', error.message);
    
    // ERROR HANDLING: Clean error messages for frontend
    if (error.message.includes('Cannot generate')) {
      throw error; // Already has proper error message
    } else {
      throw new Error('Cannot generate trip, please try again');
    }
  }
};

/**
 * Generate accurate trip description using actual route data
 * @param {Object} routeData - Complete route information
 * @param {string} tripType - 'walking' or 'bicycle'
 * @returns {Promise<string>} - Generated description
 */
const generateAccurateTripDescription = async (routeData, tripType) => {
  const { startLocation, startCity, routes, totalDistance, days } = routeData;
  
  // Gather actual route information
  const routeDetails = routes.map(route => ({
    from: route.from || startCity,
    to: route.to || startCity,
    distance: route.distanceValue,
    landscapes: route.landscapes?.length || 0
  }));

  const totalLandscapes = routes.reduce((total, route) => total + (route.landscapes?.length || 0), 0);
  const isCircular = tripType === 'walking' || (routes.length > 0 && routes[0].from === routes[routes.length - 1].to);
  
  const prompt = `Create a SHORT, compelling description (max 15 words) for this ${tripType} trip.

ROUTE DATA:
- City: ${startCity}
- Distance: ${totalDistance.toFixed(1)}km
- Type: ${isCircular ? 'Circular' : 'Point-to-point'}
- Scenic points: ${totalLandscapes}

REQUIREMENTS:
- Maximum 15 words
- Include distance and city name
- Sound exciting but accurate
- ${totalLandscapes > 0 ? `Mention ${totalLandscapes} scenic points` : 'Focus on exploration'}

GOOD EXAMPLES:
- "Scenic 12.4km circular walking route around Tel Aviv with 6 viewpoints"
- "Explore Tel Aviv on this 12.4km walking adventure featuring scenic stops"
- "12.4km Tel Aviv walking circuit showcasing the city's highlights"

Generate SHORT description:`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a travel writer who creates accurate, engaging descriptions based on actual route data. Never invent landmarks or attractions not mentioned in the route data."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.5, // Lower temperature for more accuracy
      max_tokens: 120,
    });

    return completion.choices[0].message.content.trim().replace(/^"|"$/g, '');
  } catch (error) {
    console.error('Failed to generate description:', error);
    // Accurate fallback description
    if (isCircular) {
      return `Scenic ${totalDistance.toFixed(1)}km circular ${tripType} route around ${startCity}${totalLandscapes > 0 ? ` with ${totalLandscapes} scenic stops` : ''}`;
    } else {
      return `${totalDistance.toFixed(1)}km ${tripType} journey from ${routeDetails[0]?.from} to ${routeDetails[routeDetails.length - 1]?.to}${totalLandscapes > 0 ? ` featuring ${totalLandscapes} scenic points` : ''}`;
    }
  }
};

// Google polyline decoder for backend
const decodeGooglePolyline = (encoded) => {
  if (!encoded || typeof encoded !== 'string') return [];
  
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      
      // Decode latitude
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      
      // Decode longitude
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }
  } catch (error) {
    console.error('Polyline decode error:', error);
  }
  
  return points;
};

// EXPORT FUNCTIONS: Make functions available to other modules
module.exports = {
  getLocationCoordinates,
  generateRoutes,
  generateBicycleRoutes,
  generateWalkingRoutes,
  calculateRoute,
  findNearbyCities,
  getCityCoordinates
};