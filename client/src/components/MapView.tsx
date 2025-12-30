import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import { Plus, Navigation, AlertCircle } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../state/store";
import MapEvents from "./MapEvents";
import { useSpots } from "../queries";
import { TEL_AVIV_DEFAULT } from "../constants";
import { useSelector } from "react-redux";
import L from "leaflet";

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
      if (map.getContainer().querySelector(".leaflet-tile-loaded")) {
        callLoaded();
      }
    };

    // Check immediately and after a short delay
    checkLoaded();
    const checkTimeout = setTimeout(checkLoaded, 100);

    // Also listen for the load event in case it hasn't fired yet
    const onLoad = () => callLoaded();
    map.once("load", onLoad);

    const onTileError = () => setTimeout(() => callLoaded(), 400);
    map.on("tileerror", onTileError);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t);
      clearTimeout(checkTimeout);
      window.removeEventListener("resize", onResize);
      map.off("tileerror", onTileError);
      map.off("load", onLoad);
    };
  }, [map, onLoaded]);
  return null;
}

function MapCursor({ cursor }: { cursor: string }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = cursor;
    return () => {
      container.style.cursor = "";
    };
  }, [map, cursor]);
  return null;
}

function CenterMapOnEvent() {
  const map = useMap();
  const selectedEvent = useSelector(
    (state: RootState) => state.app.selectedEvent
  );

  useEffect(() => {
    if (selectedEvent && selectedEvent.location && selectedEvent.location.length >= 2) {
      // Use the same format as in HotSpotter.tsx: location[0] = lat, location[1] = lng
      const lat = selectedEvent.location[0];
      const lng = selectedEvent.location[1];
      // Center map on event location with a nice zoom level
      map.setView([lat, lng], 15, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedEvent, map]);

  return null;
}

function CenterOnUserLocationHandler({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();
  
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

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
  onSelectSpot,
  onToggleCreate,
}: {
  onSelectSpot: (s: any) => void;
  onToggleCreate: () => void;
}) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const onChooseLocation = useAppSelector(
    (state: RootState) => state.app.onChooseLocation
  );
  const currentUserLocation = useAppSelector(
    (state: RootState) => state.app.currentUserLocation
  );

  const handleCenterOnLocation = () => {
    if (!mapInstance) return;
    
    if (currentUserLocation) {
      mapInstance.setView([currentUserLocation.lat, currentUserLocation.lng], 16, {
        animate: true,
        duration: 0.5,
      });
    } else {
      // If location is not available, request it
      mapInstance.locate({
        enableHighAccuracy: true,
        watch: false,
        timeout: 10000,
        maximumAge: 0,
      });
    }
  };

  
  // Get events from Redux
  const events = useSelector((state: RootState) => state.events.events);

  // Fetch spots based on current map bounds
  const { spots, total, isPending: spotsLoading, fetchCheck } = useSpots();
  
  // Custom icons for different marker types
  const spotIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  const eventIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[TEL_AVIV_DEFAULT.lat, TEL_AVIV_DEFAULT.lng]}
        zoom={16}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <InvalidateMapSize onLoaded={(v) => setMapLoaded(v)} />
        <MapCursor cursor={onChooseLocation ? "crosshair" : "pointer"} />
        <CenterMapOnEvent />
        <CenterOnUserLocationHandler onMapReady={setMapInstance} />
        <MapEvents />
        {currentUserLocation && (
          <Circle
            center={[currentUserLocation.lat, currentUserLocation.lng]}
            radius={20}
            color="blue"
            fillColor="blue"
            fillOpacity={0.5}
            opacity={0.5}
            weight={1}
          />
        )}

        {/* Show spots if we should fetch them */}
        {fetchCheck.shouldFetch && spots?.map((spot) => (
          <Marker
            key={`spot-${spot.id}`}
            position={[spot.location[0], spot.location[1]]}
            icon={spotIcon}
            eventHandlers={{ click: () => onSelectSpot(spot) }}
          >
            <Popup>
              <div>
                <strong>{spot.name}</strong>
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Spot</span>
                {spot.description && (
                  <div className="text-sm text-gray-600">{spot.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {spot.category} • {spot.spot_type}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Show events */}
        {fetchCheck.shouldFetch && events?.map((event: any) => (
          <Marker
            key={`event-${event.id}`}
            position={[event.location[0], event.location[1]]}
            icon={eventIcon}
            eventHandlers={{ click: () => onSelectSpot(event) }}
          >
            <Popup>
              <div>
                <strong>{event.name}</strong>
                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Event</span>
                {event.description && (
                  <div className="text-sm text-gray-600">{event.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {event.category} • {event.date}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Location button - always visible */}
      <button
        onClick={handleCenterOnLocation}
        className="absolute bottom-8 right-28 bg-green-600 text-white p-4 rounded-full shadow-xl hover:bg-green-700 transition-all hover:scale-110 z-40"
        title="Center on my location"
      >
        <Navigation size={24} />
      </button>

      {/* Only show create button if user is authenticated */}
      {isAuthenticated && (
        <button
          onClick={onToggleCreate}
          className="absolute bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110 z-40"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Loading states */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            <div className="text-sm text-gray-600">Loading map…</div>
          </div>
        </div>
      )}

      {/* Zoom message overlay */}
      {!fetchCheck.shouldFetch && fetchCheck.message && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertCircle size={20} />
          <span className="font-medium">{fetchCheck.message}</span>
        </div>
      )}

      {/* Loading spots indicator */}
      {spotsLoading && fetchCheck.shouldFetch && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
          <span className="text-sm">Loading spots...</span>
        </div>
      )}

      {/* Spots count indicator */}
      {fetchCheck.shouldFetch && spots && spots.length > 0 && !spotsLoading && (
        <div className="absolute bottom-24 left-4 bg-white px-3 py-2 rounded-lg shadow-md z-50 text-sm text-gray-700">
          {spots.length} spot{spots.length !== 1 ? 's' : ''} visible
        </div>
      )}
    </div>
  );
}
