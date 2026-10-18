# AI Trip Planner

**A full-stack web app that plans hiking and cycling routes with AI and real map data.**

Choose a starting location and a trip type. The app builds a route using the OpenAI API and Google Maps, shows it on an interactive map with points of interest along the way, adds a weather forecast, and lets you save the trip and see statistics about your trips.

---

## Features

- **Two trip types**
  - **Trek:** one day, 5–15 km
  - **Bike:** two days, up to 60 km per day
- **AI route planning:** the OpenAI API suggests stops near the starting point and writes a short description of the route. The descriptions are based on real route data from Google Maps, and the model is instructed not to invent places.
- **Real routes:** Google Directions, Geocoding and Places APIs build the route and find landscapes within 0.5 km of it.
- **Interactive map:** routes are drawn on a Leaflet map.
- **Weather:** a forecast for the trip from OpenWeatherMap.
- **Destination images:** generated with DALL·E 3, with Unsplash as a fallback.
- **Accounts:** registration and login with JWT; passwords hashed with bcrypt.
- **Saved trips and statistics:** trips are stored in MongoDB. Statistics (trip counts, total and average distance by trip type) are calculated with a MongoDB aggregation pipeline.

## Tech stack

| Area          | Technologies                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------- |
| Frontend      | React 19, React Router, Tailwind CSS, Leaflet (react-leaflet), Axios                          |
| Backend       | Node.js, Express                                                                              |
| Database      | MongoDB with Mongoose                                                                         |
| Auth          | JWT, bcrypt                                                                                   |
| External APIs | OpenAI (GPT, DALL·E 3), Google Maps (Directions, Geocoding, Places), OpenWeatherMap, Unsplash |

## Project structure

```
Web_App_Project/
├── trip-planner-client/        # React app
│   └── src/
│       ├── pages/              # Auth, Dashboard, TripPlanning, SavedTrips, TripStatistics
│       ├── contexts/           # Auth context
│       ├── services/api.js     # API client
│       └── utils/              # Polyline decoder for map routes
└── trip-planner-server/        # Express API
    ├── routes/                 # /api/auth, /api/trips
    ├── controllers/
    ├── models/                 # User, Trip (Mongoose)
    ├── services/               # AI, landscapes, weather, images
    └── middleware/auth.js      # JWT verification
```

## API

| Method           | Endpoint                 | Description                                    |
| ---------------- | ------------------------ | ---------------------------------------------- |
| POST             | `/api/auth/register`     | Create an account                              |
| POST             | `/api/auth/login`        | Log in and receive a JWT                       |
| GET              | `/api/auth/profile`      | Current user (auth required)                   |
| POST             | `/api/trips/generate`    | Generate a trip from `location` and `tripType` |
| GET, POST        | `/api/trips`             | List saved trips / save a trip                 |
| GET, PUT, DELETE | `/api/trips/:id`         | Get, update or delete a trip                   |
| GET              | `/api/trips/:id/weather` | Weather forecast for a trip                    |
| GET              | `/api/trips/stats`       | Statistics for the current user                |

All `/api/trips` routes require a valid JWT.

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB database (local or MongoDB Atlas)
- API keys for OpenAI, Google Maps, OpenWeatherMap and Unsplash

### Server

Create `trip-planner-server/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=choose_a_long_random_secret
OPENAI_API_KEY=your_openai_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
WEATHER_API_KEY=your_openweathermap_key
UNSPLASH_ACCESS_KEY=your_unsplash_key
```

```bash
cd trip-planner-server
npm install
node server.js
```

### Client

The client calls `http://localhost:5000/api` by default. To use a different server, create `trip-planner-client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
cd trip-planner-client
npm install
npm start
```

Open http://localhost:3000.

> The `.env` files are not committed. Never commit API keys.
