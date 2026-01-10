// ==========================================
// INDEX.JS - APPLICATION ENTRY POINT & LEAFLET SETUP
// ==========================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // Global CSS styles
import 'leaflet/dist/leaflet.css'; // Leaflet map styles
import App from './App';
import reportWebVitals from './reportWebVitals';

// ---- LEAFLET ICON FIX ----
// PROBLEM: Leaflet markers don't work properly in React by default
// SOLUTION: Manually configure marker icons with correct paths

import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// ICON CONFIGURATION: Fix Leaflet marker icons for React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PERFORMANCE MONITORING: Optional web vitals reporting
reportWebVitals();