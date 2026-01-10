// ==========================================
// APP.JS - MAIN APPLICATION ROUTER & AUTHENTICATION FLOW
// ==========================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// PAGE IMPORTS: All main application pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TripPlanning from './pages/TripPlanning';
import SavedTrips from './pages/SavedTrips';
import TripStatistics from './pages/TripStatistics';

/**
 * FULL SCREEN SPINNER: Loading component for authentication checks
 * PURPOSE: Prevent flash of content while verifying user authentication
 * DESIGN: Glassmorphism loading screen with backdrop blur
 */
function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
      <div className="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-3 text-sm text-gray-600">Loading…</p>
      </div>
    </div>
  );
}

/**
 * REQUIRE AUTH COMPONENT: Protected route wrapper
 * PURPOSE: Ensure only authenticated users can access protected pages
 * 
 * AUTHENTICATION FLOW:
 * 1. Check if authentication is still loading (token validation)
 * 2. If loading, show spinner to prevent flash
 * 3. If user exists, render protected content
 * 4. If no user, redirect to authentication page
 * 
 * @param {Object} children - Protected component to render
 */
function RequireAuth({ children }) {
  const { user, isLoading } = useAuth();

  // LOADING STATE: Still checking authentication status
  if (isLoading) return <FullScreenSpinner />;

  // AUTHENTICATION CHECK: Redirect to auth if not logged in
  return user ? children : <Navigate to="/auth" replace />;
}

/**
 * MAIN APP COMPONENT: Application router and authentication wrapper
 * 
 * ARCHITECTURE:
 * - AuthProvider wraps entire app for global auth state
 * - BrowserRouter enables client-side routing
 * - Routes define the application's page structure
 * - RequireAuth protects authenticated pages
 * 
 * ROUTING STRATEGY:
 * - Public: /auth (login/register)
 * - Protected: All other routes require authentication
 * - Fallback: Unknown routes redirect to dashboard
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC ROUTE: Authentication page */}
          <Route path="/auth" element={<AuthPage />} />

          {/* PROTECTED ROUTES: All require authentication */}

          {/* DASHBOARD: Main landing page after login */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          {/* TRIP PLANNING: AI-powered trip generation */}
          <Route
            path="/plan-trip"
            element={
              <RequireAuth>
                <TripPlanning />
              </RequireAuth>
            }
          />

          {/* SAVED TRIPS: View and manage saved trips */}
          <Route
            path="/saved-trips"
            element={
              <RequireAuth>
                <SavedTrips />
              </RequireAuth>
            }
          />

          {/* STATISTICS: Trip analytics and insights */}
          <Route
            path="/stats"
            element={
              <RequireAuth>
                <TripStatistics />
              </RequireAuth>
            }
          />

          {/* FALLBACK ROUTE: Redirect unknown paths to dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}