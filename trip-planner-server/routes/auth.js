const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Private routes
router.get('/profile', auth, getProfile);

module.exports = router;