import './index.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import HotSpotter from './HotSpotter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
const queryClient = new QueryClient()

createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HotSpotter />
    </QueryClientProvider>
  </React.StrictMode>
)
