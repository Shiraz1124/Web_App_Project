import React, { useState, useEffect } from 'react';
import { tripsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const TripStatistics = () => {
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Load trip statistics and all trips
      const [statsResponse, tripsResponse] = await Promise.all([
        tripsAPI.getStats(),
        tripsAPI.getTrips()
      ]);
      
      setStats(statsResponse.data.data);
      setTrips(tripsResponse.data.data.trips);
      
    } catch (error) {
      console.error('Load statistics error:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const calculateAdvancedStats = () => {
    if (!trips || trips.length === 0) return null;

    const totalDistance = trips.reduce((sum, trip) => sum + trip.totalDistance, 0);
    const trekTrips = trips.filter(trip => trip.tripType === 'trek');
    const bikeTrips = trips.filter(trip => trip.tripType === 'bike');
    
    const averageDistance = totalDistance / trips.length;
    const longestTrip = trips.reduce((longest, trip) => 
      trip.totalDistance > longest.totalDistance ? trip : longest, trips[0]);
    const shortestTrip = trips.reduce((shortest, trip) => 
      trip.totalDistance < shortest.totalDistance ? trip : shortest, trips[0]);

    // Locations visited (changed from countries)
    const locations = [...new Set(trips.map(trip => trip.location || trip.country).filter(Boolean))];
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTrips = trips.filter(trip => 
      new Date(trip.createdAt) > thirtyDaysAgo
    );

    return {
      totalTrips: trips.length,
      totalDistance,
      averageDistance: Math.round(averageDistance),
      trekCount: trekTrips.length,
      bikeCount: bikeTrips.length,
      longestTrip,
      shortestTrip,
      locations, // Changed from countries
      recentTrips: recentTrips.length,
      trekDistance: trekTrips.reduce((sum, trip) => sum + trip.totalDistance, 0),
      bikeDistance: bikeTrips.reduce((sum, trip) => sum + trip.totalDistance, 0)
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const advancedStats = calculateAdvancedStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your adventure statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg">📊</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Trip Statistics
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
                onClick={() => navigate('/saved-trips')}
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                My Trips
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
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!advancedStats || advancedStats.totalTrips === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📊</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Trip Data Yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start planning and saving trips to see your adventure statistics!
            </p>
            <button
              onClick={() => navigate('/plan-trip')}
              className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-medium"
            >
              Plan Your First Trip
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🗺️</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">{advancedStats.totalTrips}</h3>
                    <p className="text-sm text-gray-600">Total Trips</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📏</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">{advancedStats.totalDistance.toFixed(2)}</h3>
                    <p className="text-sm text-gray-600">Total KM</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">{advancedStats.averageDistance}</h3>
                    <p className="text-sm text-gray-600">Avg KM/Trip</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🌍</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">{advancedStats.locations.length}</h3>
                    <p className="text-sm text-gray-600">Locations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Trip Type Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">🚶</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">Trekking</h4>
                        <p className="text-sm text-gray-600">{advancedStats.trekDistance} km total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{advancedStats.trekCount}</div>
                      <div className="text-sm text-gray-600">trips</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">🚴</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">Cycling</h4>
                        <p className="text-sm text-gray-600">{advancedStats.bikeDistance} km total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">{advancedStats.bikeCount}</div>
                      <div className="text-sm text-gray-600">trips</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Trip Records</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">🏆 Longest Trip</h4>
                        <p className="text-sm text-gray-600">{advancedStats.longestTrip.name}</p>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {advancedStats.longestTrip.totalDistance} km
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">🎯 Shortest Trip</h4>
                        <p className="text-sm text-gray-600">{advancedStats.shortestTrip.name}</p>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {advancedStats.shortestTrip.totalDistance} km
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">📅 Recent Activity</h4>
                        <p className="text-sm text-gray-600">Last 30 days</p>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {advancedStats.recentTrips}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Locations Explored */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Locations Explored</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {advancedStats.locations.map((location, index) => {
                  const locationTrips = trips.filter(trip => 
                    (trip.location || trip.country) === location
                  );
                  const locationDistance = locationTrips.reduce((sum, trip) => sum + trip.totalDistance, 0);
                  
                  return (
                    <div key={index} className="p-4 bg-white/50 rounded-lg border border-gray-200">
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900">{location}</h4>
                        <p className="text-sm text-gray-600">{locationTrips.length} trips</p>
                        <p className="text-sm text-blue-600">{locationDistance} km</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Trips */}
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Trips</h3>
              <div className="space-y-3">
                {trips.slice(0, 5).map((trip) => (
                  <div key={trip._id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{trip.tripType === 'trek' ? '🚶' : '🚴'}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{trip.name}</h4>
                        <p className="text-sm text-gray-600">{trip.location || trip.country} • {trip.totalDistance} km</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(trip.createdAt)}</p>
                    </div>
                  </div>
                ))}
                
                {trips.length > 5 && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => navigate('/saved-trips')}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all {trips.length} trips →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripStatistics;