// ==========================================
// TRIP CONTROLLER - BUSINESS LOGIC LAYER
// ==========================================

const Trip = require('../models/Trip');
const { generateRoutes, getCityCoordinates  } = require('../services/aiService');
const { getWeatherForecast } = require('../services/weatherService');
const { getLocationImage } = require('../services/imageService');

/**
 * TRIP VALIDATION: Critical business rule enforcement
 * PURPOSE: Ensure generated trips meet strict requirements for safety and feasibility
 * 
 * BUSINESS RULES:
 * - Bike trips: Exactly 2 days, 20-60km per day, city-to-city
 * - Trek trips: Exactly 1 day, 5-15km, circular route
 */
const validateTripData = (tripData) => {
  const errors = [];
  
  // BIKE TRIP VALIDATION: Multi-day touring requirements
  if (tripData.tripType === 'bike') {
    // DAY COUNT VALIDATION: Must be exactly 2 days for bike tours
    if (tripData.route.length !== 2) {
      errors.push('Bike trips must have exactly 2 days');
    }
    
    // DISTANCE VALIDATION: Safety limits for cycling
    tripData.route.forEach((day, index) => {
      if (day.distance > 60) {
        errors.push(`Day ${index + 1} distance (${day.distance}km) exceeds 60km limit`);
      }
      if (day.distance < 20) {
        errors.push(`Day ${index + 1} distance (${day.distance}km) is too short for cycling`);
      }
    });
    
    // ROUTE CONTINUITY: Day 2 must start where Day 1 ends
    if (tripData.route.length === 2) {
      const day1End = tripData.route[0].coordinates[tripData.route[0].coordinates.length - 1];
      const day2Start = tripData.route[1].coordinates[0];
      
      // COORDINATE COMPARISON: Small tolerance for floating point precision
      if (Math.abs(day1End[0] - day2Start[0]) > 0.001 || Math.abs(day1End[1] - day2Start[1]) > 0.001) {
        errors.push('Day 2 must start where Day 1 ends (continuous route)');
      }
    }
    
    // ROUTE TYPE VALIDATION: Bike tours should be point-to-point, not circular
    if (tripData.route.length === 2) {
      const startPoint = tripData.route[0].startPoint;
      const endPoint = tripData.route[1].endPoint;
      if (startPoint === endPoint) {
        errors.push('Bike tours should be city-to-city, not circular');
      }
    }
  }
  
  // TREK TRIP VALIDATION: Single-day walking requirements
  if (tripData.tripType === 'trek') {
    // DAY COUNT VALIDATION: Must be exactly 1 day for treks
    if (tripData.route.length !== 1) {
      errors.push('Trek trips must have exactly 1 day');
    }
    
    // DISTANCE VALIDATION: Comfortable walking limits
    const day = tripData.route[0];
    if (day.distance < 5 || day.distance > 15) {
      errors.push(`Trek distance (${day.distance}km) must be between 5-15km`);
    }
    
    // CIRCULAR ROUTE VALIDATION: Start and end must be same location
    const start = day.coordinates[0];
    const end = day.coordinates[day.coordinates.length - 1];
    if (Math.abs(start[0] - end[0]) > 0.001 || Math.abs(start[1] - end[1]) > 0.001) {
      errors.push('Trek routes must be circular (start and end at same location)');
    }
    
    // POINT NAME VALIDATION: Start and end points must match
    if (day.startPoint !== day.endPoint) {
      errors.push('Trek start and end points must be the same');
    }
  }
  
  return errors;
};

/**
 * TRIP GENERATION ENDPOINT: AI-powered trip creation for preview
 * PURPOSE: Generate complete trip with AI, weather, images, and landscapes
 * NOTE: Weather data is for preview only - not saved to database
 * 
 * @route POST /api/trips/generate
 * @access Private (requires authentication)
 */
const generateTrip = async (req, res) => {
  try {
    const { location, tripType } = req.body;

    // INPUT VALIDATION: Ensure required fields are provided
    if (!location || !tripType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide location and tripType'
      });
    }

    // TRIP TYPE VALIDATION: Only allow supported trip types
    if (!['trek', 'bike'].includes(tripType)) {
      return res.status(400).json({
        success: false,
        message: 'Trip type must be either trek or bike'
      });
    }

    console.log(`Generating ${tripType} trip for ${location}...`);

    // OPTIONS CONFIGURATION: Set parameters based on trip type
      const options = {};
      if (tripType === 'bike') {
        options.days = 2;   // Bike tours are 2-day experiences
        options.maxDistancePerDay = 60; // Maximum safe cycling distance
      } else if (tripType === 'trek') {
        options.days = 1;   // Treks are single-day experiences
        options.targetDistancePerDay = 10; // Comfortable walking distance
      }

      // AI ROUTE GENERATION: Generate routes using AI service
      const routeData = await generateRoutes(
        location, 
        tripType === 'bike' ? 'bicycle' : 'walking', 
        options
      );

      // DATA TRANSFORMATION: Convert AI service output to Trip model format 
      const tripData = transformRouteDataToTripFormat(routeData, tripType);

    
    // BUSINESS RULE VALIDATION: Ensure generated trip meets requirements
    const validationErrors = validateTripData(tripData);
    if (validationErrors.length > 0) {
      console.warn('Trip validation warnings:', validationErrors);
     // Continue but log issues - AI service should handle most problems
    }
    
    // WEATHER INTEGRATION: Get current forecast for the starting location
    let weather = null;
    try {
      let weatherLat, weatherLng;
      
      const firstDayCoords = tripData.route[0].coordinates;
      
      // COORDINATE EXTRACTION: Handle different coordinate formats
      if (typeof firstDayCoords === 'string') {
        // CASE 1: Polyline string from Google Maps - decode to get coordinates
        console.log('🌤️ Weather: Decoding polyline for coordinates');
        
        try {
          const decodedPoints = decodePolylineSimple(firstDayCoords);
          if (decodedPoints.length > 0) {
            weatherLat = decodedPoints[0][0];
            weatherLng = decodedPoints[0][1];
            console.log(`✅ Weather: Decoded coordinates: ${weatherLat}, ${weatherLng}`);
          } else {
            throw new Error('No points decoded');
          }
        } catch (error) {
          console.warn('⚠️ Weather: Polyline decode failed, using start coordinates');
          // FALLBACK: Use original start coordinates
          weatherLat = routeData.startCoords.lat;
          weatherLng = routeData.startCoords.lng;
        }
        
      } else if (Array.isArray(firstDayCoords) && firstDayCoords.length > 0) {
        // CASE 2: Already a coordinate array
        console.log('🌤️ Weather: Using coordinate array');
        const firstPoint = firstDayCoords[0];
        weatherLat = firstPoint[0];
        weatherLng = firstPoint[1];
        console.log(`✅ Weather: Array coordinates: ${weatherLat}, ${weatherLng}`);
        
      } else {
        // CASE 3: Fallback to original start coordinates
        console.warn('⚠️ Weather: Invalid coordinates format, using fallback');
        weatherLat = routeData.startCoords.lat;
        weatherLng = routeData.startCoords.lng;
      }
      
      console.log(`🌤️ Final weather coordinates: ${weatherLat}, ${weatherLng}`);
      
      // COORDINATE VALIDATION: Ensure valid coordinates before API call
      if (!weatherLat || !weatherLng || isNaN(weatherLat) || isNaN(weatherLng)) {
        console.error('❌ Weather: Invalid coordinates, skipping weather');
        weather = null;
      } else {
        // WEATHER API CALL: Get 3-day forecast starting from tomorrow
        weather = await getWeatherForecast(weatherLat, weatherLng, location);
      }
    } catch (error) {
      console.warn('Weather API failed, continuing without weather:', error.message);
      weather = null; // Continue without weather data
    }
    
    // IMAGE INTEGRATION: Get location-appropriate image
    const image = await getLocationImage(location);
    
    // RESPONSE ASSEMBLY: Combine all data for preview
    const completeTrip = {
      ...tripData,
      image: image.url,
      imageInfo: {
        description: image.description,
        photographer: image.photographer,
        source: image.source
      },
      weather: weather // PREVIEW ONLY - NOT SAVED TO DATABASE
    };

    // SUCCESS RESPONSE: Return complete trip data with validation warnings
    res.json({
      success: true,
      message: 'Trip generated successfully',
      data: {
        trip: completeTrip,
        validationWarnings: validationErrors.length > 0 ? validationErrors : undefined
      }
    });

  } catch (error) {
    console.error('Generate trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate trip. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * TRIP CREATION ENDPOINT: Save trip to database (without weather)
 * PURPOSE: Persist user's trip after they're satisfied with the preview
 * NOTE: Weather is not saved - it's fetched fresh when needed
 * 
 * @route POST /api/trips
 * @access Private (requires authentication)
 */
const createTrip = async (req, res) => {
  try {
    const { name, description, location, tripType, route, image, tags } = req.body;

    // INPUT VALIDATION: Ensure all required fields are provided
    if (!name || !location  || !tripType || !route) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, location, tripType, and route'
      });
    }

    // BUSINESS RULE VALIDATION: Validate trip data before saving
    const tripDataToValidate = { tripType, route };
    const validationErrors = validateTripData(tripDataToValidate);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Trip validation failed',
        errors: validationErrors
      });
    }

    // IMAGE FALLBACK: Get image if not provided
    let tripImage = image;
    if (!tripImage) {
      try {
        const imageData = await getLocationImage(location);
        tripImage = imageData.url;
      } catch (error) {
        console.log('Could not fetch image, proceeding without it');
      }
    }

    // DATABASE CREATION: Create new Trip document
    const trip = new Trip({
      name: name.trim(),
      description: description?.trim(),
      location: location,
      tripType,
      route,
      image: tripImage,
      tags: tags || [],
      userId: req.user.userId // AUTHENTICATION: Link trip to authenticated user
    });

    // DATABASE SAVE: Persist to MongoDB
    const savedTrip = await trip.save();

    // SUCCESS RESPONSE: Return saved trip data
    res.status(201).json({
      success: true,
      message: 'Trip saved successfully (without weather data)',
      data: {
        trip: savedTrip
      }
    });

  } catch (error) {
    console.error('Create trip error:', error);

    // ERROR HANDLING: Provide specific error messages
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating trip'
    });
  }
};

// @desc    Get all trips for logged-in user
// @route   GET /api/trips
// @access  Private
const getMyTrips = async (req, res) => {
  try {
    const { tripType, location, page = 1, limit = 10 } = req.query;

    // Build filter options
    const options = {};
    if (tripType) options.tripType = tripType;
    if (location) options.location = location;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get trips using our custom static method
    let query = Trip.findByUser(req.user.userId, options);
    
    // Add pagination
    query = query.skip(skip).limit(parseInt(limit));

    const trips = await query;
    
    // Get total count for pagination
    const total = await Trip.countDocuments({ 
      userId: req.user.userId,
      ...options
    });

    res.json({
      success: true,
      data: {
        trips,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTrips: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching trips'
    });
  }
};

// @desc    Get single trip by ID
// @route   GET /api/trips/:id
// @access  Private
const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user.userId // Ensure user can only access their own trips
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized'
      });
    }

    res.json({
      success: true,
      data: {
        trip
      }
    });

  } catch (error) {
    console.error('Get trip by ID error:', error);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching trip'
    });
  }
};

// @desc    Update trip
// @route   PUT /api/trips/:id
// @access  Private
const updateTrip = async (req, res) => {
  try {
    const { name, description, image, tags } = req.body;

    // Find trip and ensure it belongs to the user
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized'
      });
    }

    // Update allowed fields only (don't allow changing route, country, tripType)
    if (name) trip.name = name.trim();
    if (description !== undefined) trip.description = description?.trim();
    if (image !== undefined) trip.image = image?.trim();
    if (tags) trip.tags = tags;

    const updatedTrip = await trip.save();

    res.json({
      success: true,
      message: 'Trip updated successfully',
      data: {
        trip: updatedTrip
      }
    });

  } catch (error) {
    console.error('Update trip error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating trip'
    });
  }
};

// @desc    Delete trip
// @route   DELETE /api/trips/:id
// @access  Private
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId // Ensure user can only delete their own trips
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Trip deleted successfully',
      data: {
        deletedTrip: trip
      }
    });

  } catch (error) {
    console.error('Delete trip error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error deleting trip'
    });
  }
};

// @desc    Get user trip statistics
// @route   GET /api/trips/stats
// @access  Private
const getTripStats = async (req, res) => {
  try {
    // Use the static method from Trip model
    const stats = await Trip.getStatsByUser(req.user.userId);
    
    // Get additional statistics
    const totalTrips = await Trip.countDocuments({ userId: req.user.userId });
    
    res.json({
      success: true,
      data: {
        totalTrips,
        statsByType: stats,
        user: {
          id: req.user.userId,
          name: req.user.name
        }
      }
    });

  } catch (error) {
    console.error('Get trip stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statistics'
    });
  }
};

/**
 * CURRENT WEATHER ENDPOINT: Get fresh weather forecast for saved trip
 * PURPOSE: Provide current weather conditions when user views their saved trip
 * STRATEGY: Resolve starting point coordinates and fetch 3-day forecast
 * 
 * @route GET /api/trips/:id/weather
 * @access Private (requires authentication)
 */
const getTripWeather = async (req, res) => {
  try {
    // TRIP LOOKUP: Find trip by ID and ensure user ownership
    const trip = await Trip.findOne({
      _id: req.params.id,
      userId: req.user.userId // AUTHORIZATION: Ensure user can only access their trips
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found or unauthorized'
      });
    }

    // ROUTE VALIDATION: Ensure trip has route data
    if (!trip.route || trip.route.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Trip has no route data'
      });
    }

    console.log(`🌤️ Getting weather for trip: ${trip.name}`);

    // STARTING POINT EXTRACTION: Get the route's starting location
    const startingPoint = trip.route[0].startPoint;
    
    if (!startingPoint) {
      return res.status(400).json({
        success: false,
        message: 'Trip route has no starting point defined'
      });
    }

    console.log(`📍 Route starting point: ${startingPoint}`);

    // COORDINATE RESOLUTION: Convert starting point name to lat/lng
    let locationData;
    try {
      locationData = await getCityCoordinates(startingPoint);
    } catch (error) {
      console.error('Location resolution failed for starting point:', error.message);
      return res.status(400).json({
        success: false,
        message: `Unable to resolve starting point "${startingPoint}" for weather forecast.`,
        error: error.message
      });
    }

    // WEATHER FORECAST: Get 3-day forecast starting from tomorrow
    let weather;
    try {
      weather = await getWeatherForecast(
        locationData.lat,
        locationData.lng,
        startingPoint
      );
    } catch (error) {
      console.error('Weather API failed:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch weather data at this time',
        error: error.message
      });
    }

    // SUCCESS RESPONSE: Return current weather forecast
    res.json({
      success: true,
      message: 'Weather forecast retrieved for route starting point (starting tomorrow)',
      data: {
        tripId: trip._id,
        tripName: trip.name,
        routeStartingPoint: startingPoint,
        resolvedLocation: {
            lat: locationData.lat,
            lng: locationData.lng,
            fullAddress: locationData.formattedAddress
        },
        weather: weather
      }
    });

  } catch (error) {
    console.error('Get trip weather error:', error);
    
    // ERROR HANDLING: Handle invalid trip IDs
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid trip ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error fetching weather',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * DATA TRANSFORMATION: Convert AI service output to Trip model format
 * PURPOSE: Bridge between AI service response and database schema
 * HANDLES: Both polyline strings and coordinate arrays
 */
const transformRouteDataToTripFormat = (routeData, tripType) => {
  console.log('🔄 Transforming route data:', routeData);
  
  // ROUTE PROCESSING: Transform each day's route data
  const routes = routeData.routes.map((route, index) => {
    let coordinates;
    let startPoint, endPoint;
    
    // COORDINATE HANDLING: Use real Google Maps polyline if available
    if (route.polyline && typeof route.polyline === 'string' && route.polyline.length > 0) {
      console.log(`✅ Day ${route.day}: Using REAL Google Maps polyline (${route.polyline.length} chars)`);
      coordinates = route.polyline;
      
      // POINT NAMING: Different logic for bike vs trek
      if (tripType === 'bike') {
        startPoint = route.from || routeData.startCity;
        endPoint = route.to || routeData.startCity;
      } else {
        startPoint = routeData.startCity || 'Tel Aviv';
        endPoint = startPoint; // Circular route
      }
      
    } else {
      // FALLBACK COORDINATES: Generate if no real polyline available
      console.warn(`⚠️ Day ${route.day}: No real polyline available, generating fallback`);
      
      if (tripType === 'bike') {
        coordinates = generateBikeRouteCoordinates(routeData.startCoords, route, routeData.routes, index);
        startPoint = route.from || routeData.startCity;
        endPoint = route.to || routeData.startCity;
      } else {
        coordinates = generateCircularCoordinates(routeData.startCoords || { lat: 31.7683, lng: 35.2137 }, route.distanceValue || 10);
        startPoint = routeData.startCity || 'Tel Aviv';
        endPoint = startPoint;
      }
    }
    
    // ROUTE OBJECT: Standardized format for database storage
    return {
      day: route.day || index + 1,
      coordinates: coordinates,
      distance: route.distanceValue || 0,
      startPoint: startPoint,
      endPoint: endPoint,
      description: tripType === 'trek' 
        ? `Circular route around ${startPoint} - ${route.distance || (route.distanceValue + 'km')}`
        : `${startPoint} to ${endPoint} - ${route.distance || (route.distanceValue + 'km')}`,
      polyline: route.polyline || null,
      landscapes: route.landscapes || [], 
      hasRealRoute: !!(route.polyline && route.polyline.length > 0)
    };
  });

  // TRIP METADATA: Create complete trip object
  return {
    name: `${tripType === 'bike' ? 'Bicycle Tour' : 'Walking Trek'} in ${routeData.startLocation}`,
    description: routeData.description || `${routeData.type} covering ${routeData.totalDistance?.toFixed(1)}km over ${routeData.days || routeData.routes.length} day(s)`,
    location: routeData.startLocation,
    country: routeData.startCity,
    city: routeData.startCity,
    tripType: tripType,
    route: routes,
    totalDistance: routeData.totalDistance || 0,
    estimatedDuration: `${routeData.totalDuration?.toFixed(1)} hours`
  };
};

/**
 * POLYLINE DECODER: Decode Google Maps encoded polyline for coordinate extraction
 * PURPOSE: Extract starting coordinates from encoded polyline for weather API
 * NOTE: Simplified version that only decodes first few points
 */
function decodePolylineSimple(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    // DECODE ALGORITHM: Google's polyline encoding algorithm
    let pointCount = 0;
    while (index < len && pointCount < 3) {
      let b;
      let shift = 0;
      let result = 0;
      
      // LATITUDE DECODING: Extract latitude delta
      do {
        if (index >= len) break;
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      
      if (index >= len) break;
      
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      
      // LONGITUDE DECODING: Extract longitude delta
      do {
        if (index >= len) break;
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < len);
      
      if (index >= len) break;
      
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      // COORDINATE CONVERSION: Convert to decimal degrees
      points.push([lat / 1e5, lng / 1e5]);
      pointCount++;
    }
  } catch (error) {
    console.error('Polyline decode error:', error);
  }
  
  return points;
}

// Generate coordinates for bicycle routes (point-to-point)
const generateBikeRouteCoordinates = (startCoords, currentRoute, allRoutes, routeIndex) => {
  if (!startCoords) {
    console.warn('⚠️ No start coordinates, using default');
    return [[31.7683, 35.2137], [31.7683, 35.2137]];
  }
  
  // For bike routes, we need to create realistic point-to-point paths
  let fromCoords, toCoords;
  
  if (routeIndex === 0) {
    // First day: start from the original starting coordinates
    fromCoords = startCoords;
    
    // Generate destination coordinates based on distance and direction
    const distance = currentRoute.distanceValue || 40;
    toCoords = generateDestinationCoords(fromCoords, distance, routeIndex);
    
  } else {
    // Subsequent days: start where previous day ended
    const prevRoute = allRoutes[routeIndex - 1];
    
    // Previous destination becomes current start
    fromCoords = generateDestinationCoords(startCoords, prevRoute.distanceValue || 40, routeIndex - 1);
    
    // Generate new destination
    const distance = currentRoute.distanceValue || 40;
    toCoords = generateDestinationCoords(fromCoords, distance, routeIndex);
  }
  
  // Create a realistic route path with multiple points
  const coordinates = [];
  const numPoints = Math.max(5, Math.floor((currentRoute.distanceValue || 40) / 8)); // More points for longer routes
  
  for (let i = 0; i <= numPoints; i++) {
    const progress = i / numPoints;
    
    // Linear interpolation with some variation for realism
    const lat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * progress;
    const lng = fromCoords.lng + (toCoords.lng - fromCoords.lng) * progress;
    
    // Add slight variation to make route look more realistic (not perfectly straight)
    const variation = 0.002; // Small random variation
    const latVariation = (Math.random() - 0.5) * variation * Math.sin(progress * Math.PI);
    const lngVariation = (Math.random() - 0.5) * variation * Math.cos(progress * Math.PI);
    
    coordinates.push([
      lat + latVariation,
      lng + lngVariation
    ]);
  }
  
  console.log(`🚴 Generated bike route: ${fromCoords.lat.toFixed(3)},${fromCoords.lng.toFixed(3)} → ${toCoords.lat.toFixed(3)},${toCoords.lng.toFixed(3)}`);
  return coordinates;
};

// Generate destination coordinates based on distance and direction
const generateDestinationCoords = (startCoords, distanceKm, dayIndex) => {
  const { lat, lng } = startCoords;
  
  // Use different directions for each day to create variety
  const directions = [
    { lat: 0.7, lng: 0.7 },   // Day 1: Northeast
    { lat: -0.5, lng: 0.8 },  // Day 2: Southeast  
    { lat: 0.3, lng: -0.9 },  // Day 3: Northwest
    { lat: -0.8, lng: -0.4 }, // Day 4: Southwest
    { lat: 0.9, lng: 0.1 },   // Day 5: North
    { lat: -0.1, lng: 0.9 }   // Day 6: East
  ];
  
  const direction = directions[dayIndex % directions.length];
  
  // Convert distance to degrees (roughly)
  const kmToDegrees = distanceKm / 111; // Rough conversion
  
  return {
    lat: lat + (kmToDegrees * direction.lat),
    lng: lng + (kmToDegrees * direction.lng)
  };
};

// Generate circular coordinates for walking routes - TRULY circular
const generateCircularCoordinates = (startCoords, distance) => {
  if (!startCoords) {
    console.warn('⚠️ No start coordinates for walking route, using default');
    return [[31.7683, 35.2137], [31.7683, 35.2137]];
  }
  
  const { lat, lng } = startCoords;
  const coordinates = [];
  const numPoints = Math.max(8, Math.floor(distance / 1.5)); // More points for longer walks
  const radius = distance / (2 * Math.PI) / 111; // Convert km to degrees (roughly)
  
  // CRITICAL: Start with the exact starting point
  coordinates.push([lat, lng]);
  
  for (let i = 1; i <= numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const pointLat = lat + radius * Math.cos(angle);
    const pointLng = lng + radius * Math.sin(angle);
    coordinates.push([pointLat, pointLng]);
  }
  
  // CRITICAL: End with the EXACT same starting point (not approximate)
  coordinates.push([lat, lng]);
  
  console.log(`🚶 Generated circular walking route: ${coordinates.length} points, start/end: ${lat.toFixed(6)},${lng.toFixed(6)}`);
  console.log(`🔄 First point: [${coordinates[0][0].toFixed(6)}, ${coordinates[0][1].toFixed(6)}]`);
  console.log(`🔄 Last point: [${coordinates[coordinates.length-1][0].toFixed(6)}, ${coordinates[coordinates.length-1][1].toFixed(6)}]`);
  
  // Additional verification
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  const isCircular = Math.abs(firstPoint[0] - lastPoint[0]) < 0.000001 && Math.abs(firstPoint[1] - lastPoint[1]) < 0.000001;
  console.log(`✅ Route is circular: ${isCircular}`);
  
  return coordinates;
};
// EXPORT CONTROLLER FUNCTIONS: Make available to route handlers
module.exports = {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripStats,
  generateTrip,    
  getTripWeather  
};