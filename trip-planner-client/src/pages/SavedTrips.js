// ==========================================
// SAVED TRIPS COMPONENT - TRIP MANAGEMENT & WEATHER
// ==========================================

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { tripsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const SavedTrips = () => {
  // ---- STATE MANAGEMENT ----
  const [trips, setTrips] = useState([]); // User's saved trips
  const [selectedTrip, setSelectedTrip] = useState(null); // Currently viewed trip
  const [loading, setLoading] = useState(true); // Initial trips loading
  const [error, setError] = useState(''); // Error messages

  // ---- WEATHER STATE ----
  // Weather is fetched separately for each trip when requested
  const [weather, setWeather] = useState(null); // Current weather data
  const [weatherLoading, setWeatherLoading] = useState(false); // Weather fetch loading

  // ---- MAP STATE ----
  const [mapCenter, setMapCenter] = useState([31.7683, 35.2137]); // Map center coordinates
  const [showLandscapes, setShowLandscapes] = useState(true);       // Landscape visibility toggle

  // ---- UI STATE ----
  const [deleteModal, setDeleteModal] = useState({  // Delete confirmation modal
      show: false,
      tripId: null,
      tripName: ''
    });

  // ---- FILTERS ----  
  const [filters, setFilters] = useState({ // Trip filtering options
    tripType: '', // 'trek' or 'bike' or ''
    location: '' // Location search string
  });

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Create landscape icon
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
    iconAnchor: [14, 28],
    popupAnchor: [0, -24]
  });

  // ---- COMPONENT INITIALIZATION ----
  // Load user's trips when component mounts or filters change
  useEffect(() => {
    loadTrips();
  }, [filters]);


  /**
   * LOAD TRIPS: Fetch user's saved trips from backend
   * PURPOSE: Populate the trips list with optional filtering
   */
  const loadTrips = async () => {
    try {
      setLoading(true);

      // API CALL: Get trips with current filter parameters
      const response = await tripsAPI.getTrips(filters);
      setTrips(response.data.data.trips);
    } catch (error) {
      setError('Failed to load trips');
      console.error('Load trips error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * TRIP SELECTION HANDLER: Display selected trip on map
   * PURPOSE: Show trip details and center map on selected route
   */
  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setWeather(null); // Clear previous weather data
    setError(''); // Clear any previous errors
    
    // MAP CENTERING: Focus map on trip's starting point
    if (trip.route && trip.route[0]?.coordinates) {
      setMapCenter(trip.route[0].coordinates[0]);
    }
  };

  /**
   * WEATHER LOADING: Fetch current weather for selected trip
   * PURPOSE: Get fresh 3-day forecast for trip's starting location
   * 
   * IMPORTANT: Weather is fetched fresh each time, not stored in database
   * This ensures users always see current weather conditions
   */
  const loadCurrentWeather = async () => {
    if (!selectedTrip) return;
    
    try {
      setWeatherLoading(true);
      setError('');

      // API CALL: Get current weather for trip's starting point
      const response = await tripsAPI.getTripWeather(selectedTrip._id);
      setWeather(response.data.data);
    } catch (error) {
      console.error('Weather loading error:', error);
      setError('Failed to load current weather forecast');
    } finally {
      setWeatherLoading(false);
    }
  };

  /**
   * DELETE TRIP HANDLERS: Manage trip deletion with confirmation
   * PURPOSE: Safely remove trips with user confirmation
   */
  const handleDeleteTrip = async (tripId, tripName) => {
  // SHOW CONFIRMATION MODAL  
  setDeleteModal({
    show: true,
    tripId: tripId,
    tripName: tripName
  });
};

const confirmDelete = async () => {
  try {
    // API CALL: Delete trip from backend
    await tripsAPI.deleteTrip(deleteModal.tripId);

    // LOCAL STATE UPDATE: Remove from trips list
    setTrips(trips.filter(trip => trip._id !== deleteModal.tripId));
    
    // CLEANUP: Clear selected trip if it was deleted
    if (selectedTrip && selectedTrip._id === deleteModal.tripId) {
      setSelectedTrip(null);
      setWeather(null);
    }
    
    // CLOSE MODAL
    setDeleteModal({ show: false, tripId: null, tripName: '' });
  } catch (error) {
    setError('Failed to delete trip');
    setDeleteModal({ show: false, tripId: null, tripName: '' });
  }
};

const cancelDelete = () => {
  setDeleteModal({ show: false, tripId: null, tripName: '' });
};

// ---- UTILITY FUNCTIONS ----

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total landscapes for selected trip
  const totalLandscapes = selectedTrip 
    ? selectedTrip.route.reduce((total, day) => total + (day.landscapes?.length || 0), 0)
    : 0;

  // Helper function to get landscape type labels with emojis
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

  // COMPONENT RENDER
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg">🏔️</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  My Saved Trips
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/plan-trip')}
                className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Plan New Trip
              </button>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700 text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Trip List Sidebar */}
          <div className="lg:col-span-1">
            {/* Filters */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Filters</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trip Type
                  </label>
                  <select
                    value={filters.tripType}
                    onChange={(e) => setFilters({...filters, tripType: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="trek">🚶 Trek</option>
                    <option value="bike">🚴 Bike</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                    placeholder="Filter by location (country, region, city)"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter any location: Israel, Jerusalem, Tuscany, etc.
                  </p>
                </div>
              </div>
            </div>

            {/* Trip List */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Your Trips ({trips.length})
              </h3>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No trips found</p>
                  <button
                    onClick={() => navigate('/plan-trip')}
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Plan Your First Trip
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {trips.map((trip) => {
                    const tripLandscapes = trip.route.reduce((total, day) => total + (day.landscapes?.length || 0), 0);
                    
                    return (
                      <div
                        key={trip._id}
                        onClick={() => handleTripSelect(trip)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                          selectedTrip?._id === trip._id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-white/50 border border-gray-200 hover:bg-white/70'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{trip.name}</h4>
                          <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrip(trip._id, trip.name);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          🗑️
                        </button>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{trip.tripType === 'trek' ? '🚶' : '🚴'}</span>
                          <span>{trip.totalDistance.toFixed(2)}km</span>
                          <span>{trip.location || `${trip.city || ''}${trip.city && trip.country ? ', ' : ''}${trip.country || ''}`}</span>
                        </div>
                        {/* NEW: Show landscapes count */}
                        {tripLandscapes > 0 && (
                          <div className="text-xs text-purple-600 mt-1">
                            🏞️ {tripLandscapes} scenic points
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {formatDate(trip.createdAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Selected Trip Details */}
            {selectedTrip && (
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedTrip.name}</h2>
                    <p className="text-gray-600 mt-1">{selectedTrip.description}</p>
                  </div>
                  {selectedTrip.image && (
                    <img
                      src={selectedTrip.image}
                      alt={selectedTrip.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedTrip.totalDistance.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">Total KM</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-600">{selectedTrip.route.length}</div>
                    <div className="text-xs text-gray-600">Days</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{selectedTrip.tripType}</div>
                    <div className="text-xs text-gray-600">Type</div>
                  </div>
                  {/* NEW: Landscapes count */}
                  {totalLandscapes > 0 && (
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{totalLandscapes}</div>
                      <div className="text-xs text-gray-600">Scenic Points</div>
                    </div>
                  )}
                </div>

                {/* Route Details */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-gray-800">Route Details:</h5>
                  
                  {selectedTrip.tripType === 'trek' ? (
                    // TREK FORMAT: Simple single route
                    <div className="bg-white/50 p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🚶</span>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {selectedTrip.route[0].startPoint} - {selectedTrip.route[0].distance} km
                          </div>
                          <div className="text-sm text-gray-600">
                            Circular walking route
                          </div>
                        </div>
                      </div>
                      
                      {/* Show landscapes count if available */}
                      {selectedTrip.route[0].landscapes && selectedTrip.route[0].landscapes.length > 0 && (
                        <div className="mt-1 text-xs text-purple-600 flex items-center">
                          <span className="mr-1">🏞️</span>
                          <span>{selectedTrip.route[0].landscapes.length} scenic points</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    // BIKE FORMAT: Keep existing format
                    selectedTrip.route.map((day, index) => (
                      <div key={index} className="bg-white/50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Day {day.day}</span>
                          <span className="text-sm text-gray-600">{day.distance} km</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {day.startPoint} → {day.endPoint}
                        </div>
                        {day.description && (
                          <div className="text-xs text-gray-500 mt-1">{day.description}</div>
                        )}
                        {day.landscapes && day.landscapes.length > 0 && (
                          <div className="text-xs text-purple-600 mt-1">
                            🏞️ {day.landscapes.length} scenic points: {day.landscapes.map(l => l.name).join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Weather Forecast Section */}
            {selectedTrip && (
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Weather Forecast
                  </h3>
                  
                  {/* GET CURRENT WEATHER BUTTON */}
                  <button
                    onClick={loadCurrentWeather}
                    disabled={weatherLoading}
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {weatherLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Loading...
                      </div>
                    ) : (
                      '🌤️ Get Current Weather'
                    )}
                  </button>
                </div>
                
                {weather ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">📍 {weather.resolvedLocation.fullAddress}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {weather.weather.forecasts.map((day) => (
                        <div key={day.day} className="bg-white/50 p-4 rounded-lg text-center">
                          <div className="text-lg mb-2">{day.icon}</div>
                          <div className="font-semibold text-gray-900">{day.date}</div>
                          <div className="text-2xl font-bold text-blue-600 my-2">
                            {day.temperature.max}°
                          </div>
                          <div className="text-sm text-gray-600">
                            {day.temperature.min}° - {day.temperature.max}°
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {day.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            💨 {day.windSpeed} km/h • 💧 {day.humidity}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🌤️</div>
                    <p className="text-gray-500 font-medium mb-4">
                      Click "Get Current Weather" to see the latest 3-day forecast
                    </p>
                    <p className="text-sm text-gray-400">
                      Weather forecast will start from tomorrow (perfect for trip planning!)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 h-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Route Map</h3>
                
                {/* NEW: Landscape Toggle */}
                {selectedTrip && totalLandscapes > 0 && (
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
              
              <div className="h-full rounded-xl overflow-hidden relative">
                <MapContainer
                  center={mapCenter}
                  zoom={selectedTrip ? 12 : 8}
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-xl"
                  key={selectedTrip?._id} // Force re-render when trip changes
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {selectedTrip && selectedTrip.route.map((day, dayIndex) => (
                    <React.Fragment key={dayIndex}>
                      <Polyline
                        positions={day.coordinates}
                        pathOptions={{
                          color: dayIndex === 0 ? '#3B82F6' : '#10B981',
                          weight: 4,
                          opacity: 0.8
                        }}
                      />
                      
                      <Marker position={day.coordinates[0]}>
                        <Popup>
                          <div className="text-center">
                            <strong>Day {day.day} Start</strong><br/>
                            {day.startPoint}<br/>
                            <em>{day.distance} km</em>
                          </div>
                        </Popup>
                      </Marker>
                      
                      {day.coordinates[0] !== day.coordinates[day.coordinates.length - 1] && (
                        <Marker position={day.coordinates[day.coordinates.length - 1]}>
                          <Popup>
                            <div className="text-center">
                              <strong>Day {day.day} End</strong><br/>
                              {day.endPoint}
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* NEW: Landscape Markers */}
                      {showLandscapes && day.landscapes && day.landscapes.map((landscape, lsIndex) => (
                        <Marker 
                          key={`saved-landscape-${day.day}-${lsIndex}`}
                          position={landscape.coordinates}
                          icon={landscapeIcon}
                        >
                          <Popup maxWidth={280} className="landscape-popup">
                            <div style={{ minWidth: 220 }}>
                              <div className="mb-2">
                                <h4 className="font-bold text-gray-900 text-base">{landscape.name}</h4>
                                <div className="text-sm text-blue-600 font-medium">
                                  {getLandscapeTypeLabel(landscape.type)}
                                </div>
                              </div>
                              
                              {landscape.description && (
                                <div className="mb-3 text-sm text-gray-700">
                                  {landscape.description}
                                </div>
                              )}
                              
                              <div className="space-y-2 text-xs text-gray-600">
                                {typeof landscape.distanceFromRouteKm === 'number' && (
                                  <div className="flex items-center gap-1">
                                    <span>📏</span>
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
                  ))}
                </MapContainer>
                
                {!selectedTrip && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🗺️</div>
                      <p className="text-gray-500 font-medium">Select a trip to view its route</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete Trip
              </h3>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{deleteModal.tripName}"?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedTrips;