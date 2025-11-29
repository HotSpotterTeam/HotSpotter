import './index.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import HotSpotter from './HotSpotter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Provider } from 'react-redux'
import { store } from './state/store'
const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
const queryClient = new QueryClient()

createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <HotSpotter />
      </Provider>
    </QueryClientProvider>
  </React.StrictMode>
)
