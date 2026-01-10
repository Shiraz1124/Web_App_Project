const axios = require('axios');

// Get 3-day weather forecast starting from TOMORROW
const getWeatherForecast = async (lat, lng, locationName = '') => {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );

    const forecast = response.data;
    
    // Process the forecast to get next 3 days STARTING FROM TOMORROW
    const dailyForecasts = processForecastDataFromTomorrow(forecast);
    
    return {
      location: locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      forecasts: dailyForecasts
    };
  } catch (error) {
    console.error('Weather API Error:', error.message);
    
    // Return fallback weather data starting from tomorrow
    return getFallbackWeatherFromTomorrow(locationName);
  }
};

// Process forecast data starting from TOMORROW (skip today)
const processForecastDataFromTomorrow = (forecastData) => {
  const dailyData = {};
  
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Reset to start of day
  
  // Group forecasts by date, starting from tomorrow
  forecastData.list.forEach(item => {
    const itemDate = new Date(item.dt * 1000);
    
    // Only include dates from tomorrow onwards
    if (itemDate >= tomorrow) {
      const dateString = itemDate.toDateString();
      
      if (!dailyData[dateString]) {
        dailyData[dateString] = {
          temperatures: [],
          conditions: [],
          humidity: [],
          windSpeed: [],
          descriptions: []
        };
      }
      
      dailyData[dateString].temperatures.push(item.main.temp);
      dailyData[dateString].conditions.push(item.weather[0].main);
      dailyData[dateString].humidity.push(item.main.humidity);
      dailyData[dateString].windSpeed.push(item.wind.speed);
      dailyData[dateString].descriptions.push(item.weather[0].description);
    }
  });
  
  // Convert to daily summaries (take first 3 days starting from tomorrow)
  const dates = Object.keys(dailyData).slice(0, 3);
  
  return dates.map((date, index) => {
    const data = dailyData[date];
    const dayNumber = index + 1; // Day 1 = tomorrow, Day 2 = day after, etc.
    
    return {
      day: dayNumber,
      date: new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      }),
      temperature: {
        min: Math.round(Math.min(...data.temperatures)),
        max: Math.round(Math.max(...data.temperatures)),
        avg: Math.round(data.temperatures.reduce((a, b) => a + b, 0) / data.temperatures.length)
      },
      condition: getMostFrequent(data.conditions),
      description: getMostFrequent(data.descriptions),
      humidity: Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length),
      windSpeed: Math.round(data.windSpeed.reduce((a, b) => a + b, 0) / data.windSpeed.length),
      icon: getWeatherIcon(getMostFrequent(data.conditions))
    };
  });
};

// Helper function to get most frequent item in array
const getMostFrequent = (arr) => {
  const frequency = {};
  let maxCount = 0;
  let mostFrequent = arr[0];
  
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
    if (frequency[item] > maxCount) {
      maxCount = frequency[item];
      mostFrequent = item;
    }
  });
  
  return mostFrequent;
};

// Map weather conditions to emoji icons
const getWeatherIcon = (condition) => {
  const iconMap = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️'
  };
  
  return iconMap[condition] || '🌤️';
};

// Fallback weather data starting from TOMORROW
const getFallbackWeatherFromTomorrow = (locationName = 'Unknown Location') => {
  return {
    location: locationName,
    forecasts: [
      {
        day: 1, // Tomorrow
        date: new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        }),
        temperature: { min: 18, max: 25, avg: 22 },
        condition: 'Partly Cloudy',
        description: 'partly cloudy',
        humidity: 65,
        windSpeed: 12,
        icon: '🌤️'
      },
      {
        day: 2, // Day after tomorrow
        date: new Date(Date.now() + 2*24*60*60*1000).toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        }),
        temperature: { min: 20, max: 27, avg: 24 },
        condition: 'Sunny',
        description: 'clear sky',
        humidity: 55,
        windSpeed: 8,
        icon: '☀️'
      },
      {
        day: 3, // Third day
        date: new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        }),
        temperature: { min: 16, max: 22, avg: 19 },
        condition: 'Cloudy',
        description: 'overcast clouds',
        humidity: 70,
        windSpeed: 15,
        icon: '☁️'
      }
    ]
  };
};

module.exports = {
  getWeatherForecast
};