const axios = require('axios');

// Get country/city image from Unsplash (free tier: 50 requests/hour)
const getLocationImage = async (location) => {
  try {
    // Try to get image from Unsplash first
    const query = location;
    
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: query,
        per_page: 1,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` // You'll need to add this to .env
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const photo = response.data.results[0];
      return {
        url: photo.urls.regular,
        description: photo.alt_description || `Beautiful view of ${query}`,
        photographer: photo.user.name,
        source: 'Unsplash'
      };
    }
    
    // Fallback to predefined images
    return getFallbackImage(location);
    
  } catch (error) {
    console.error('Image API Error:', error.message);
    return getFallbackImage(location);
  }
};

// Fallback to predefined images or use a simple pattern
const getFallbackImage = (location) => {
  // Predefined images for common destinations
  const locationImages = {
    'israel': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
    'jerusalem': 'https://images.unsplash.com/photo-1542251513-f8e880b63ceb?w=800&h=600&fit=crop',
    'tel aviv': 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=800&h=600&fit=crop',
    'haifa': 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=600&fit=crop',
    'italy': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=600&fit=crop',
    'rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop',
    'france': 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop',
    'paris': 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop',
    'netherlands': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop',
    'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop',
    'germany': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=600&fit=crop',
    'spain': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop',
    'united kingdom': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop',
    'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop'
  };
  
  // Parse the location to try different search keys
  const locationLower = location.toLowerCase();
  const parts = location.split(',').map(part => part.trim().toLowerCase());
  
  // Try multiple search strategies
  let imageUrl = locationImages[locationLower];  // Try full location first
  
  if (!imageUrl && parts.length > 1) {
    // Try each part individually
    for (const part of parts) {
      if (locationImages[part]) {
        imageUrl = locationImages[part];
        break;
      }
    }
  }
  
  // Default fallback
  if (!imageUrl) {
    imageUrl = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop';
  }
  
  return {
    url: imageUrl,
    description: `Beautiful landscape of ${location}`,
    photographer: 'Unsplash Contributor',
    source: 'Fallback Collection'
  };
};

// Alternative: Generate image with AI (if you want to use DALL-E)
const generateImageWithAI = async (location, tripType) => {
  try {
     const prompt = `A beautiful ${tripType === 'trek' ? 'hiking trail' : 'cycling route'} landscape in ${location}, photorealistic, scenic view, ${tripType === 'trek' ? 'mountains and nature trails' : 'roads and countryside'}, professional travel photography style`;
    
    // This would require OpenAI API with DALL-E access (paid)
    const response = await axios.post('https://api.openai.com/v1/images/generations', {
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      url: response.data.data[0].url,
      description: prompt,
      photographer: 'AI Generated',
      source: 'DALL-E 3'
    };
    
  } catch (error) {
    console.error('AI Image Generation Error:', error.message);
    return getFallbackImage(location);
  }
};

module.exports = {
  getLocationImage,
  generateImageWithAI
};