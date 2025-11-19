import './index.css'
import 'leaflet/dist/leaflet.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import HotSpotter from './HotSpotter'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <React.StrictMode>
    <HotSpotter />
  </React.StrictMode>
)
