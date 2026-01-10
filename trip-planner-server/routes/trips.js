const express = require('express');
const {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  getTripStats,
  generateTrip,
  getTripWeather 
} = require('../controllers/tripController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes are private (require authentication)
router.use(auth);

// Trip routes
router.route('/')
  .get(getMyTrips)     // GET /api/trips
  .post(createTrip);   // POST /api/trips

router.post('/generate', generateTrip);  // POST /api/trips/generate

router.get('/stats', getTripStats);  // GET /api/trips/stats

router.route('/:id')
  .get(getTripById)    // GET /api/trips/:id
  .put(updateTrip)     // PUT /api/trips/:id
  .delete(deleteTrip); // DELETE /api/trips/:id

router.get('/:id/weather', getTripWeather);  // GET /api/trips/:id/weather  

module.exports = router;