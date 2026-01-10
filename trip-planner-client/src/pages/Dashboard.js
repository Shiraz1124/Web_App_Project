import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
      {/* Header/Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg">🏔️</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Trip Planner
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Welcome back!</p>
                  <p className="text-xs text-gray-500">{user?.name}</p>
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🗺️</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-lg">✨</span>
                  </div>
                </div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
                Welcome to Your Adventure Hub! 
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Ready to plan some amazing trips?
              </p>
              
              {/* User Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="bg-white/80 rounded-xl p-6 shadow-lg border border-white/30">
                  <div className="text-2xl mb-2">👤</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Profile</h3>
                  <p className="text-sm text-gray-600">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                
                <div className="bg-white/80 rounded-xl p-6 shadow-lg border border-white/30">
                  <div className="text-2xl mb-2">📅</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Member Since</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(user?.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="mt-8 bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => navigate('/plan-trip')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="text-2xl mb-2">🗺️</div>
                Plan New Trip
              </button>
              <button 
                onClick={() => navigate('/saved-trips')}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <div className="text-2xl mb-2">📋</div>
                View My Trips
              </button>
             <button 
              onClick={() => navigate('/stats')}  
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <div className="text-2xl mb-2">📊</div>
              Trip Statistics
            </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;