/**
 * Polyline decoder utility for frontend
 * Add this to your frontend (create utils/polylineDecoder.js)
 */

/**
 * Decode Google Maps polyline string to coordinate array
 * @param {string} encoded - Encoded polyline string from Google Maps
 * @returns {Array<[number, number]>} - Array of [lat, lng] coordinates
 */
export function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') {
    console.warn('Invalid polyline string:', encoded);
    return [];
  }

  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  try {
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      
      // Decode latitude
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      
      // Decode longitude
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      // Convert to decimal degrees and add to points
      points.push([lat / 1e5, lng / 1e5]);
    }
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }

  console.log(`Decoded polyline: ${points.length} points from ${encoded.length} chars`);
  return points;
}

/**
 * Process trip data to decode polylines into coordinates
 * @param {Object} tripData - Trip data from backend
 * @returns {Object} - Trip data with decoded coordinates
 */
export function processTripData(tripData) {
  if (!tripData || !tripData.route) {
    return tripData;
  }

  return {
    ...tripData,
    route: tripData.route.map(day => {
      // If polyline exists, decode it to coordinates
      if (day.polyline && typeof day.polyline === 'string') {
        const decodedCoords = decodePolyline(day.polyline);
        
        return {
          ...day,
          coordinates: decodedCoords,
          originalPolyline: day.polyline // Keep original for reference
        };
      }
      
      // If coordinates already exist, use them
      if (day.coordinates && Array.isArray(day.coordinates)) {
        return day;
      }
      
      // Fallback: create minimal coordinates from start/end points
      console.warn(`No polyline or coordinates for day ${day.day}, using fallback`);
      return {
        ...day,
        coordinates: [
          // You'll need to add startCoords and endCoords to your backend response
          day.startCoords || [32.0853, 34.7818], // Default to Tel Aviv
          day.endCoords || [32.0853, 34.7818]
        ]
      };
    })
  };
}