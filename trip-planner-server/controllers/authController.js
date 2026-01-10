const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    console.log('🔐 LOGIN ATTEMPT:');
    console.log('📧 Email:', req.body.email);
    console.log('🔒 Password received:', req.body.password ? 'YES' : 'NO');
    
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password for comparison
    console.log('🔍 Looking for user with email:', email.toLowerCase());
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid email'
      });
    }

    console.log('✅ User found:', user.email);

    // Check password
    console.log('🔐 Comparing passwords...');
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      console.log('❌ Password does not match');
      
      const errorResponse = {
        success: false,
        message: 'Invalid Password'
      };
      
      console.log('📤 Sending password error response:', JSON.stringify(errorResponse));
      
      return res.status(401).json(errorResponse);
    }

    console.log('✅ Password matches!');

    // Generate token
    const token = generateToken(user._id);
    console.log('🎟️ Token generated:', token ? 'SUCCESS' : 'FAILED');

    // Return success response
    const responseData = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      }
    };

    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));
    
    res.json(responseData);

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    const savedUser = await user.save();

    // Generate token
    const token = generateToken(savedUser._id);

    // Return success response (without password)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          createdAt: savedUser.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Register error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.userId);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile
};