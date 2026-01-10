// ==========================================
// TRIP PLANNING COMPONENT - AI INTEGRATION & MAP DISPLAY
// ==========================================

import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { tripsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// ADD THIS IMPORT for polyline decoding
import { processTripData } from '../utils/polylineDecoder';

const TripPlanning = () => {
  // ---- FORM STATE MANAGEMENT ----
  // Controls user input for trip generation
  const [formData, setFormData] = useState({
    location: '',
    tripType: 'trek'
  });
  
  // ---- TRIP DATA STATE ----
  // Stores the AI-generated trip data
  const [generatedTrip, setGeneratedTrip] = useState(null);

  // ---- UI STATE MANAGEMENT ----
  // Controls loading states, errors, and user feedback
  const [loading, setLoading] = useState(false); // AI generation in progress
  const [error, setError] = useState('');        // Error messages
  const [saving, setSaving] = useState(false);   // Save operation in progress
  const [saveSuccess, setSaveSuccess] = useState(false); // Save completion feedback

  // ---- MAP STATE ----
  // Controls map display and visualization
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Default: Jerusalem
  const [showLandscapes, setShowLandscapes] = useState(true); // Toggle scenic points
  
  const navigate = useNavigate();

  // ---- CUSTOM MAP ICONS ----
  // Create custom marker for landscape/scenic points
  const landscapeIcon = new L.divIcon({
    html: `<div style="
      font-size: 20px; 
      text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
    ">🏞️</div>`,
    className: 'landscape-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 28],  // Point of the icon which corresponds to marker's location
    popupAnchor: [0, -24]  // Point from which popup should open relative to iconAnchor
  });

   /**
   * TRIP GENERATION HANDLER: Main AI integration function
   * 
   * FLOW:
   * 1. Validate user input
   * 2. Call backend AI service
   * 3. Process polyline data for map display
   * 4. Update map center to show new route
   * 
   * PURPOSE: Transform user's location input into a complete, mapped trip
   */
  const handleGenerateTrip = async (e) => {
    e.preventDefault();
    
    // INPUT VALIDATION: Ensure location is provided
    if (!formData.location.trim()) {
      setError('Please provide a location (country, region, or city)');
      return;
    }
    // UI STATE: Start loading, clear previous errors
    setLoading(true);
    setError('');
    
    try {
      console.log('Generating trip with AI...', formData);
      
      // AI API CALL: Send request to backend AI service
      const response = await tripsAPI.generateTrip({
        location: formData.location.trim(),
        tripType: formData.tripType
      });
      
      console.log('Raw trip data from backend:', response.data.data.trip);
      
      // POLYLINE PROCESSING: Convert Google Maps polylines to coordinate arrays
      // This is crucial for map display - polylines are encoded strings that need decoding
      const processedTrip = processTripData(response.data.data.trip);

      // DEBUG LOGGING: Track data transformation
      console.log('🔍 Raw trip from backend:', response.data.data.trip);
      console.log('🔍 Processed trip:', processedTrip);
      console.log('🔍 Route landscapes:', processedTrip.route[0]?.landscapes);

      console.log('Processed trip with decoded coordinates:', processedTrip);
      
      // STATE UPDATE: Store processed trip data
      setGeneratedTrip(processedTrip);
      
      // MAP CENTERING: Focus map on the generated route
      if (processedTrip.route && processedTrip.route[0]?.coordinates?.length > 0) {
        const firstCoord = processedTrip.route[0].coordinates[0];
        setMapCenter(firstCoord);
        console.log('Setting map center to:', firstCoord);
      }
      
    } catch (error) {
      console.error('Trip generation error:', error);
      // USER-FRIENDLY ERROR: Show backend error message or fallback
      setError(error.response?.data?.message || 'Failed to generate trip. Please try again.');
    } finally {
      // UI CLEANUP: Stop loading state
      setLoading(false);
    }
  };

   /**
   * TRIP SAVE HANDLER: Persist generated trip to database
   * 
   * IMPORTANT: Weather data is NOT saved to database
   * - Weather is only for preview during generation
   * - Fresh weather is fetched when viewing saved trips
   * 
   * PURPOSE: Save user's approved trip for future reference
   */
  const handleSaveTrip = async () => {
    if (!generatedTrip) return;
    
    // UI STATE: Start saving, clear previous states
    setSaving(true);
    setError('');
    setSaveSuccess(false); 
    
    try {
      // DATABASE SAVE: Send trip data to backend (excluding weather)
      await tripsAPI.createTrip({
        name: generatedTrip.name,
        description: generatedTrip.description,
        location: generatedTrip.location || formData.location,
        tripType: generatedTrip.tripType,
        route: generatedTrip.route, // Includes landscapes and coordinates
        image: generatedTrip.image, // Location image URL
        tags: generatedTrip.tags
        // NOTE: Weather is intentionally excluded - it's fetched fresh when needed
      });
      
      // SUCCESS FEEDBACK: Show success message
      setSaveSuccess(true);
      
      // AUTO REDIRECT: Navigate to saved trips after delay
      setTimeout(() => {
        navigate('/saved-trips');
      }, 4000);
      
    } catch (error) {
      console.error('Save trip error:', error);
      setError(error.response?.data?.message || 'Failed to save trip');
    } finally {
      // UI CLEANUP: Stop saving state
      setSaving(false);
    }
  };

  // INPUT CHANGE HANDLER: Update form state as user types
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // LANDSCAPE COUNT: Calculate total scenic points across all days
  const totalLandscapes = generatedTrip 
    ? generatedTrip.route.reduce((total, day) => total + (day.landscapes?.length || 0), 0)
    : 0;
  // ---- COMPONENT RENDER ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* HEADER SECTION: App branding and navigation */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* BRANDING */}
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                🗺️ Plan Your Adventure
              </h1>
              <p className="text-gray-600 mt-1">Generate custom trek and bike routes with AI</p>
            </div>
            {/* NAVIGATION BUTTONS */}
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/saved-trips')}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                My Trips
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* MAIN CONTENT: Grid layout - Form on left, Map on right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDEBAR: Trip planning form and details */}
          <div className="lg:col-span-1">

            {/* TRIP GENERATION FORM */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Trip Details</h2>
              
              <form onSubmit={handleGenerateTrip} className="space-y-4">
                {/* LOCATION INPUT: Primary user input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location (Country/Region/City) *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Israel, Jerusalem, Galilee, Italy, Rome, Tuscany"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter any location: country (Israel), region (Galilee), or city (Jerusalem)
                  </p>
                </div>
                
                {/* TRIP TYPE SELECTION: Trek vs Bike */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trip Type
                  </label>
                  <select
                    name="tripType"
                    value={formData.tripType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="trek">🚶 Trek (5-15km, 1 day)</option>
                    <option value="bike">🚴 Bike Tour (60km/day, 2 days)</option>
                  </select>
                </div>

                {/* GENERATE BUTTON: Trigger AI generation */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating with AI...
                    </div>
                  ) : (
                    '✨ Generate Trip with AI'
                  )}
                </button>
              </form>
              
              {/* ERROR DISPLAY: Show validation or API errors */}
              {error && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* TRIP DETAILS PANEL: Shown after successful generation */}
            {generatedTrip && (
              <div className="mt-6 bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                {/* TRIP HEADER: Name, description, and image */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{generatedTrip.name}</h3>
                    <p className="text-sm text-gray-600">{generatedTrip.description}</p>
                  </div>
                  {/* LOCATION IMAGE: AI-selected image for the location */}
                  {generatedTrip.image && (
                    <img
                      src={generatedTrip.image}
                      alt={generatedTrip.name}
                      className="w-16 h-16 rounded-lg object-cover ml-4"
                    />
                  )}
                </div>
                {/* TRIP METRICS: Key statistics in visual cards */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{generatedTrip.totalDistance.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">Total KM</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{generatedTrip.route.length}</div>
                    <div className="text-xs text-gray-600">Days</div>
                  </div>
                </div>

                {/* LANDSCAPES SUMMARY: Show scenic points count if available */}
                {totalLandscapes > 0 && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{totalLandscapes}</div>
                      <div className="text-xs text-gray-600">Scenic Points</div>
                    </div>
                  </div>
                )}

                
              {/* ROUTE DETAILS: Different display for trek vs bike */}
              <div className="space-y-2 mb-4">
                <h5 className="font-semibold text-gray-800">Route Details:</h5>
                
                {generatedTrip.tripType === 'trek' ? (
                  // TREK FORMAT: Simple single route display
                  <div className="bg-white/50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">🚶</span>
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">
                            {generatedTrip.route[0].startPoint} - {generatedTrip.route[0].distance} km
                          </div>
                          <div className="text-sm text-gray-600">
                            Circular walking route
                          </div>
                        </div>
                      </div>

                    </div>
                    
                    {/* LANDSCAPES COUNT for trek */}
                    {generatedTrip.route[0].landscapes && generatedTrip.route[0].landscapes.length > 0 && (
                      <div className="mt-2 text-xs text-purple-600 flex items-center">
                        <span className="mr-1">🏞️</span>
                        <span>{generatedTrip.route[0].landscapes.length} scenic points along the route</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // BIKE FORMAT: Multi-day breakdown with day-by-day details  
                  <div className="space-y-2">
                    {generatedTrip.route.map((day, index) => (
                      <div key={index} className="bg-white/50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">🚴</span>
                          <div>
                            <div className="font-semibold text-gray-900">
                              Day {day.day} - {day.startPoint} → {day.endPoint}
                            </div>
                            <div className="text-sm text-gray-600">
                            {day.distance} km
                          </div>
                          </div>
                        </div>
                        
                        {/* LANDSCAPES COUNT for each bike day */}
                        {day.landscapes && day.landscapes.length > 0 && (
                          <div className="mt-1 text-xs text-purple-600 flex items-center">
                            <span className="mr-1">🏞️</span>
                            <span>{day.landscapes.length} scenic stops</span>
                          </div>
                        )}
                      </div>
                    )      )}
                  </div>
                )}
              </div>


                {/* WEATHER FORECAST: Preview only - not saved to database */}
                {generatedTrip.weather && (
                  <div className="mb-4">
                    <h5 className="font-semibold text-gray-800 mb-2">3-Day Weather Forecast:</h5>
                    <div className="grid grid-cols-3 gap-2">
                      {generatedTrip.weather.forecasts.map((day) => (
                        <div key={day.day} className="bg-white/50 p-2 rounded text-center">
                          <div className="text-lg">{day.icon}</div>
                          <div className="text-xs font-medium">{day.date.split(',')[0]}</div>
                          <div className="text-sm font-bold text-blue-600">{day.temperature.max}°</div>
                          <div className="text-xs text-gray-500">{day.condition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SAVE BUTTON: Persist trip to database */}
                <button
                  onClick={handleSaveTrip}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {saving ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    '💾 Save Trip'
                  )}
                </button>

                {/* SUCCESS MESSAGE: Confirmation and auto-redirect info */}
                {saveSuccess && (
                  <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-green-400 text-xl mr-3">✅</span>
                      <div>
                        <p className="text-sm font-medium text-green-800">Trip saved successfully!</p>
                        <p className="text-xs text-green-600 mt-1">Redirecting to your saved trips...</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

           {/* RIGHT SIDE: Interactive map display */}
          <div className="lg:col-span-2">
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 h-[600px]">
              {/* MAP HEADER: Title and landscape toggle */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Route Map</h2>
                
                {/* LANDSCAPE TOGGLE: Show/hide scenic points on map */}
                {generatedTrip && totalLandscapes > 0 && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 px-3 py-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLandscapes}
                        onChange={(e) => setShowLandscapes(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏞️</span>
                        <span className="font-medium text-gray-900">Show Landscapes</span>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {totalLandscapes}
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
              
              {/* LEAFLET MAP CONTAINER */}
              <div className="h-full rounded-xl overflow-hidden relative">
                <MapContainer
                  center={mapCenter}
                  zoom={generatedTrip ? 12 : 8}
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-xl"
                  key={generatedTrip?.name} // Force re-render when trip changes
                >
                  {/* BASE MAP LAYER: OpenStreetMap tiles */}
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* ROUTE VISUALIZATION: Render each day's route */}
                  {generatedTrip && generatedTrip.route.map((day, dayIndex) => {
                    // DEBUG LOGGING: Track rendering for each day
                    console.log(`Rendering Day ${day.day}:`, {
                      coordinates: day.coordinates?.length || 0,
                      startPoint: day.startPoint,
                      endPoint: day.endPoint,
                      landscapes: day.landscapes?.length || 0
                    });
                    
                    // VALIDATION: Only render if we have valid coordinates
                    if (!day.coordinates || day.coordinates.length === 0) {
                      console.warn(`❌ No coordinates for day ${day.day}, skipping render`);
                      return null;
                    }
                    
                    return (
                      <React.Fragment key={dayIndex}>
                        
                        {/* ROUTE POLYLINE: Draw the actual route path */}
                        <Polyline
                          positions={day.coordinates}
                          pathOptions={{
                            color: dayIndex === 0 ? '#3B82F6' : '#10B981',
                            weight: 4,
                            opacity: 0.8
                          }}
                        />
                        
                        {/* START MARKER: Mark the beginning of each day */}
                        <Marker position={day.coordinates[0]}>
                          <Popup>
                            <div className="text-center">
                              <strong>Day {day.day} Start</strong><br/>
                              {day.startPoint}<br/>
                              <em>{day.distance} km total</em><br/>
                              <small>Coords: {day.coordinates[0][0].toFixed(4)}, {day.coordinates[0][1].toFixed(4)}</small>
                            </div>
                          </Popup>
                        </Marker>
                        
                        {/* END MARKER: Mark the end (if different from start) */}
                        {day.coordinates.length > 1 && 
                         (Math.abs(day.coordinates[0][0] - day.coordinates[day.coordinates.length - 1][0]) > 0.001 ||
                          Math.abs(day.coordinates[0][1] - day.coordinates[day.coordinates.length - 1][1]) > 0.001) && (
                          <Marker position={day.coordinates[day.coordinates.length - 1]}>
                            <Popup>
                              <div className="text-center">
                                <strong>Day {day.day} End</strong><br/>
                                {day.endPoint}<br/>
                                <small>Coords: {day.coordinates[day.coordinates.length - 1][0].toFixed(4)}, {day.coordinates[day.coordinates.length - 1][1].toFixed(4)}</small>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                         {/* LANDSCAPE MARKERS: Show scenic points along the route */}
                        {showLandscapes && day.landscapes && day.landscapes.map((landscape, lsIndex) => (
                          <Marker 
                            key={`landscape-${day.day}-${lsIndex}`}
                            position={landscape.coordinates}
                            icon={landscapeIcon}
                          >
                            {/* DETAILED LANDSCAPE POPUP */}
                            <Popup maxWidth={280} className="landscape-popup">
                              <div style={{ minWidth: 220 }}>

                                {/* LANDSCAPE HEADER */}
                                <div className="mb-2">
                                  <h4 className="font-bold text-gray-900 text-base">{landscape.name}</h4>
                                  <div className="text-sm text-blue-600 font-medium">
                                    {getLandscapeTypeLabel(landscape.type)}
                                  </div>
                                </div>
                                
                                {/* DESCRIPTION */}
                                {landscape.description && (
                                  <div className="mb-3 text-sm text-gray-700">
                                    {landscape.description}
                                  </div>
                                )}
                                
                                {/* PRACTICAL INFO */}
                                <div className="space-y-2 text-xs text-gray-600">
                                  {typeof landscape.distanceFromRouteKm === 'number' && (
                                    <div className="flex items-center gap-1">
                                      <span>📍</span>
                                      <span>Detour: {landscape.distanceFromRouteKm.toFixed(1)} km from route</span>
                                    </div>
                                  )}
                                  
                                  {landscape.suggestedStopMinutes && (
                                    <div className="flex items-center gap-1">
                                      <span>⏱️</span>
                                      <span>Suggested visit: {landscape.suggestedStopMinutes} minutes</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* LANDSCAPE IMAGE */}
                                {landscape.photoUrl && (
                                  <div className="mt-3">
                                    <img 
                                      src={landscape.photoUrl} 
                                      alt={landscape.name}
                                      className="w-full rounded-md border"
                                      style={{ maxHeight: 120, objectFit: 'cover' }}
                                      onError={(e) => e.target.style.display = 'none'}
                                    />
                                  </div>
                                )}
                                
                                {/* EXTERNAL LINK */}
                                <div className="mt-3 pt-2 border-t border-gray-200">
                                  <a
                                    href={`https://www.google.com/maps?q=${landscape.coordinates[0]},${landscape.coordinates[1]}`}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    <span>🗺️</span>
                                    Open in Google Maps
                                  </a>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
                
                {/* EMPTY STATE: Show when no trip is generated */}
                {!generatedTrip && (
                  <div className="absolute inset-6 flex items-center justify-center bg-white/50 rounded-xl">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🗺️</div>
                      <p className="text-gray-500 font-medium">Generate a trip to see the route on the map</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * LANDSCAPE TYPE HELPER: Convert landscape types to user-friendly labels
 * PURPOSE: Display scenic point types with appropriate emojis and formatting
 * 
 * @param {string} type - Landscape type from backend
 * @returns {string} - Formatted display label with emoji
 */
const getLandscapeTypeLabel = (type) => {
  const typeLabels = {
    viewpoint: '👁️ Viewpoint',
    mountain: '⛰️ Mountain',
    peak: '🏔️ Peak',
    waterfall: '💧 Waterfall',
    lake: '🏞️ Lake',
    river: '🌊 River',
    beach: '🏖️ Beach',
    park: '🌳 Park',
    forest: '🌲 Forest',
    desert: '🏜️ Desert',
    canyon: '🏔️ Canyon',
    cliff: '⛰️ Cliff',
    dunes: '🏜️ Dunes',
    garden: '🌺 Garden',
    cave: '🕳️ Cave',
    historic_site: '🏛️ Historic Site',
    monument: '🗿 Monument',
    church: '⛪ Church',
    castle: '🏰 Castle',
    other: '📍 Point of Interest'
  };

  return typeLabels[type] || `📍 ${type}`;
};

export default TripPlanning;