// ==========================================
// AUTH PAGE COMPONENT - LOGIN & REGISTRATION
// ==========================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  // ---- FORM STATE MANAGEMENT ----
  const [isLogin, setIsLogin] = useState(true); // Toggle between login/register
  const [formData, setFormData] = useState({ // Form input data
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // ---- UI STATE ----
  const [loading, setLoading] = useState(false); // Form submission loading
  const [error, setError] = useState('');        // Error messages
  const [showPassword, setShowPassword] = useState(false); // Password visibility toggle

  // ---- REDIRECT LOGIC ----
  // Automatically redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      console.log('User is logged in, redirecting to dashboard:', user);
      navigate('/', { replace: true });
    }
  }, [user, navigate]);


  /**
   * INPUT CHANGE HANDLER: Update form state as user types
   * PURPOSE: Maintain controlled form inputs and clear errors
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // UX IMPROVEMENT: Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  /**
   * FORM SUBMISSION HANDLER: Process login or registration
   * 
   * VALIDATION FLOW:
   * 1. Prevent duplicate submissions
   * 2. Validate required fields
   * 3. Additional validation for registration
   * 4. Call appropriate auth function
   * 5. Handle success/error states
   */
  const handleSubmit = async () => {
    // DUPLICATE SUBMISSION PREVENTION
    if (loading) {
      return;
    }
    
    // CLEAR PREVIOUS STATE
    setError('');
    
    // BASIC VALIDATION: Required fields
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!formData.password.trim()) {
      setError('Password is required');
      return;
    }

    // REGISTRATION VALIDATION: Additional fields and password matching
    if (!isLogin) {
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    console.log('Starting authentication...', { isLogin, email: formData.email });
    setLoading(true);

    try {
      let result;
      
      if (isLogin) {
        // LOGIN FLOW: Authenticate existing user
        console.log('Calling login with:', { email: formData.email });
        result = await login({
          email: formData.email,
          password: formData.password
        });
        console.log('Login completed, result:', result);
      } else {
        // REGISTRATION FLOW: Create new user account
        console.log('Calling register with:', { name: formData.name, email: formData.email });
        result = await register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        console.log('Register completed, result:', result);
      }
      
      console.log('Authentication successful! Waiting for redirect...');
      
      // FORM CLEANUP: Clear sensitive data on success
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // REDIRECT: The useEffect above handles automatic redirect when user state updates
      
    } catch (err) {
      // ERROR HANDLING: Display user-friendly error messages
      console.error('Authentication error:', err);
      console.error('Error response:', err?.response?.data);
      setError(err?.response?.data?.message || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * MODE SWITCH HANDLER: Toggle between login and registration
   * PURPOSE: Clear form and error state when switching modes
   */
  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  /**
   * KEYBOARD HANDLER: Submit form on Enter key
   * PURPOSE: Improve user experience with keyboard navigation
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // ---- COMPONENT RENDER ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* BACKGROUND DESIGN: Decorative elements */}
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>
      
      {/* MAIN FORM CONTAINER */}
      <div className="relative max-w-md w-full">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
         
          {/* HEADER SECTION: Branding and mode indication */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                {/* APP ICON: Dynamic color based on mode */}
                <div className={`w-16 h-16 bg-gradient-to-r rounded-2xl flex items-center justify-center shadow-lg ${
                  isLogin 
                    ? 'from-blue-500 to-emerald-500' 
                    : 'from-emerald-500 to-blue-500'
                }`}>
                  <span className="text-2xl">🏔️</span>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-xs">🗺️</span>
                </div>
              </div>
            </div>

            {/* DYNAMIC TITLES: Change based on login/register mode */}
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              {isLogin ? 'Welcome Back!' : 'Join Trip Planner'}
            </h2>
            <p className="mt-2 text-gray-600 font-medium">
              {isLogin ? 'Sign in to continue your adventure 🌍' : 'Start planning amazing trips today ✨'}
            </p>
          </div>
          
          {/* ERROR DISPLAY: User-friendly error messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* FORM FIELDS */}
          <div className="space-y-5">

            {/* NAME FIELD: Only shown in registration mode */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                />
              </div>
            )}
            
            {/* EMAIL FIELD: Always required */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
              />
            </div>
            
            {/* PASSWORD FIELD: With visibility toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 pr-12"
                />
                {/* PASSWORD VISIBILITY TOGGLE */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <span className="text-gray-400 hover:text-gray-600 text-lg">
                    {showPassword ? '🙈' : '👁️'}
                  </span>
                </button>
              </div>
            </div>
            
            {/* CONFIRM PASSWORD: Only in registration mode */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                />
              </div>
            )}

            {/* SUBMIT BUTTON: Dynamic text and styling based on mode */}
            <div
              onClick={handleSubmit}
              className={`w-full text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform cursor-pointer text-center shadow-lg ${
                loading 
                  ? 'opacity-50 cursor-not-allowed bg-gray-400' 
                  : isLogin
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 hover:scale-[1.02]'
                    : 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 hover:scale-[1.02]'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </div>

            {/* MODE SWITCH DIVIDER */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  {isLogin ? 'New to Trip Planner?' : 'Already have an account?'}
                </span>
              </div>
            </div>

            {/* MODE SWITCH BUTTON: Toggle between login and registration */}
            <div
              onClick={switchMode}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 transform hover:scale-[1.02] cursor-pointer text-center"
            >
              {isLogin ? 'Create your account' : 'Sign in instead'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}