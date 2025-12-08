import './index.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import HotSpotter from './HotSpotter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { store } from './state/store'
const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
const queryClient = new QueryClient()

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

if (!GOOGLE_CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID is not defined in .env file')
}
createRoot(root).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <HotSpotter />
        </Provider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
