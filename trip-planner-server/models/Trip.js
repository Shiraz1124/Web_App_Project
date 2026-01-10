const mongoose = require('mongoose');


const landscapeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
    maxLength: [100, 'Landscape name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,  // Normalize to lowercase
    maxLength: [50, 'Type cannot exceed 50 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxLength: [300, 'Description cannot exceed 300 characters']
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coords) {
        return Array.isArray(coords) && 
               coords.length === 2 && 
               coords[0] >= -90 && coords[0] <= 90 && 
               coords[1] >= -180 && coords[1] <= 180;
      },
      message: 'Coordinates must be [latitude, longitude] with valid ranges'
    }
  },
  photoUrl: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(url) {
        if (!url) return true;
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Photo URL must be a valid HTTP/HTTPS URL'
    }
  },
  suggestedStopMinutes: { 
    type: Number, 
    min: 5, 
    max: 240, 
    default: 20 
  },
  distanceFromRouteKm: { 
    type: Number, 
    min: 0,
    default: 0
  },
  source: { 
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxLength: [20, 'Source cannot exceed 20 characters']
  }
}, { _id: false });

// Daily route schema with landscapes
const dailyRouteSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    min: 1
  },
  coordinates: {
    type: [[Number]], // Array of coordinate pairs [lat, lng]
    required: true,
    validate: {
      validator: function(coords) {
        // Ensure each coordinate pair has exactly 2 numbers (lat, lng)
        return coords.every(coord => 
          Array.isArray(coord) && 
          coord.length === 2 && 
          coord.every(num => typeof num === 'number')
        );
      },
      message: 'Coordinates must be arrays of [latitude, longitude] pairs'
    }
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  startPoint: {
    type: String,
    required: true,
    trim: true
  },
  endPoint: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Landscapes array for this day
  landscapes: { 
    type: [landscapeSchema], 
    default: [] 
  }
}, { _id: false });

const tripSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Trip name is required'],
    trim: true,
    maxLength: [100, 'Trip name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxLength: [500, 'Description cannot exceed 500 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  location: {
    type: String,
    trim: true,
    maxLength: [100, 'Location cannot exceed 100 characters']
  },
  tripType: {
    type: String,
    required: [true, 'Trip type is required'],
    enum: {
      values: ['trek', 'bike'],
      message: 'Trip type must be either trek or bike'
    }
  },
  route: {
    type: [dailyRouteSchema],
    required: true,
    validate: {
      validator: function(route) {
        if (!Array.isArray(route) || route.length === 0) {
          return false;
        }
        
        // For bike trips: exactly 2 days, max 60km per day
        if (this.tripType === 'bike') {
          if (route.length !== 2) return false;
          return route.every(day => day.distance <= 60);
        }
        
        // For trek trips: 1 day, 5-15km
        if (this.tripType === 'trek') {
          if (route.length !== 1) return false;
          return route[0].distance >= 5 && route[0].distance <= 15;
        }
        
        return true;
      },
      message: function(props) {
        if (props.value.tripType === 'bike') {
          return 'Bike trips must have exactly 2 days with max 60km per day';
        }
        return 'Trek trips must have 1 day with 5-15km distance';
      }
    }
  },
  totalDistance: {
    type: Number,
    min: 0
  },
  image: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        if (!url) return true; // Optional field
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
               /^https:\/\/images\.unsplash\.com/.test(url) ||
               /^https:\/\/.*/.test(url);
      },
      message: 'Image must be a valid URL'
    }
  },
  estimatedDuration: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    maxLength: 20
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating total distance from route
tripSchema.virtual('calculatedTotalDistance').get(function() {
  return this.route.reduce((total, day) => total + day.distance, 0);
});

// Virtual for total landscapes count
tripSchema.virtual('totalLandscapes').get(function() {
  return this.route.reduce((total, day) => total + (day.landscapes?.length || 0), 0);
});

// Pre-save middleware to calculate total distance
tripSchema.pre('save', function(next) {
  if (this.route && this.route.length > 0) {
    this.totalDistance = this.route.reduce((total, day) => total + day.distance, 0);
  }
  next();
});

// Index for better query performance
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ location: 1 });
tripSchema.index({ userId: 1, location: 1 });

// Instance methods
tripSchema.methods.getDurationInDays = function() {
  return this.route.length;
};

tripSchema.methods.getAverageDistancePerDay = function() {
  if (this.route.length === 0) return 0;
  return this.totalDistance / this.route.length;
};

// Get total landscapes count
tripSchema.methods.getTotalLandscapesCount = function() {
  return this.route.reduce((total, day) => total + (day.landscapes?.length || 0), 0);
};

// Static methods
tripSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.tripType) {
    query.where('tripType').equals(options.tripType);
  }

  if (options.location) {
    query.where('location').regex(new RegExp(options.location, 'i'));
  }
  
  return query.sort({ createdAt: -1 });
};

tripSchema.statics.getStatsByUser = async function(userId) {
  try {
    const stats = await this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$tripType',
          count: { $sum: 1 },
          totalDistance: { $sum: '$totalDistance' },
          avgDistance: { $avg: '$totalDistance' },
          // NEW: Add total landscapes to stats
          totalLandscapes: { 
            $sum: { 
              $sum: { 
                $map: { 
                  input: '$route', 
                  as: 'day', 
                  in: { $size: { $ifNull: ['$$day.landscapes', []] } } 
                } 
              } 
            } 
          }
        }
      }
    ]);
    
    return stats;
  } catch (error) {
    console.error('Stats aggregation error:', error);
    throw error;
  }
};

module.exports = mongoose.model('Trip', tripSchema);