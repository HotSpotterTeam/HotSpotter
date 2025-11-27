import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Plus } from 'lucide-react';

function InvalidateMapSize({ onLoaded }: { onLoaded?: (v: boolean) => void }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    
    let hasCalledLoaded = false;
    const callLoaded = () => {
      if (!hasCalledLoaded) {
        hasCalledLoaded = true;
        onLoaded?.(true);
      }
    };
    
    // Check if map is already loaded by checking if it has tiles
    // If tiles are already present, call onLoaded immediately
    const checkLoaded = () => {
      if (map.getContainer().querySelector('.leaflet-tile-loaded')) {
        callLoaded();
      }
    };
    
    // Check immediately and after a short delay
    checkLoaded();
    const checkTimeout = setTimeout(checkLoaded, 100);
    
    // Also listen for the load event in case it hasn't fired yet
    const onLoad = () => callLoaded();
    map.once('load', onLoad);
    
    const onTileError = () => setTimeout(() => callLoaded(), 400);
    map.on('tileerror', onTileError);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    
    return () => {
      clearTimeout(t);
      clearTimeout(checkTimeout);
      window.removeEventListener('resize', onResize);
      map.off('tileerror', onTileError);
      map.off('load', onLoad);
    };
  }, [map, onLoaded]);
  return null;
}

type Spot = {
  id: number;
  title: string;
  description?: string;
  lat: number;
  lng: number;
};

export default function MapView({
  spots,
  onSelectSpot,
  onToggleCreate,
}: {
  spots: Spot[];
  onSelectSpot: (s: any) => void;
  onToggleCreate: () => void;
}) {
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer center={[32.8191, 34.9983]} zoom={13} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <InvalidateMapSize onLoaded={(v) => setMapLoaded(v)} />

        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            eventHandlers={{ click: () => onSelectSpot(spot) }}
          >
            <Popup>
              <div>
                <strong>{spot.title}</strong>
                <div className="text-sm text-gray-600">{spot.description}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button
        onClick={onToggleCreate}
        className="absolute bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110 z-40"
      >
        <Plus size={24} />
      </button>

      {!mapLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            <div className="text-sm text-gray-600">Loading map…</div>
          </div>
        </div>
      )}
    </div>
  );
}
