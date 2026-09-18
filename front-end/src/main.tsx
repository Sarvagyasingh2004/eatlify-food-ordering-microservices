import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from './context/AppContext.tsx';
import 'leaflet/dist/leaflet.css';
import { SocketProvider } from './context/SocketContext.tsx';
// In production nginx path-routes /api/* to the right service, so all six point
// at one host and one certificate. Locally each service has its own port, which
// is what the fallbacks cover - dev needs no .env at all.
const apiBase = import.meta.env.VITE_API_BASE_URL;

export const authService = apiBase ?? 'http://localhost:5001';
export const restaurantService = apiBase ?? 'http://localhost:5002';
export const utilsService = apiBase ?? 'http://localhost:5003';
export const realtimeService = apiBase ?? 'http://localhost:5004';
export const riderService = apiBase ?? 'http://localhost:5005';
export const adminService = apiBase ?? 'http://localhost:5006';

// Public by design - this is the browser-side OAuth client id, not a secret.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  ?? '40824392049-dulihkus2rqj7pqttfogmfvipku609gr.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
