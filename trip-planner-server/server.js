// ==========================================
// SERVER.JS - MAIN EXPRESS APPLICATION
// ==========================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// CONFIGURATION: Load environment variables from .env file
dotenv.config();

// DATABASE: Establish MongoDB connection using Mongoose
connectDB();

const app = express();

// CORS CONFIGURATION: Enable Cross-Origin Resource Sharing
// This allows frontend (React on port 3000) to communicate with backend (port 5000)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // PRODUCTION: Use environment variable for production domain
    process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : 'http://localhost:3000'
  ],
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Required for JWT tokens
  optionsSuccessStatus: 200 // Legacy browser support
}));

// Handle preflight requests
app.options('*', cors());

// MIDDLEWARE: Parse JSON requests (max 10MB for image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// DEVELOPMENT LOGGING: Log all requests in development mode
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    next();
  });
}

// ROUTES: Mount route handlers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// GLOBAL ERROR HANDLER: Centralized error handling for the entire application
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  // MONGOOSE VALIDATION ERROR: Handle schema validation failures
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // MONGOOSE DUPLICATE KEY ERROR: Handle unique constraint violations
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  // JWT ERRORS: Handle token-related authentication failures
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // DEFAULT ERROR: Generic server error response
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'  
      ? 'Internal server error'   // Hide error details in production
      : err.message   // Show error details in development
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('CORS enabled for: http://localhost:3000');
  console.log('Available routes:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/auth/profile');
  console.log('  GET  /api/trips');
  console.log('  POST /api/trips');
  console.log('  GET  /api/trips/stats');
  console.log('  GET  /api/trips/:id');
  console.log('  PUT  /api/trips/:id');
  console.log('  DELETE /api/trips/:id');
});