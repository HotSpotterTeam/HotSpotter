import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  CircleMarker,
} from "react-leaflet";
import { Navigation, AlertCircle, Filter } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../state/store";
import MapEvents from "./MapEvents";
import FilterPanel from "./FilterPanel";
import { useSpots, useEvents } from "../queries";
import { TEL_AVIV_DEFAULT } from "../constants";
import { categoryIcons, categoryColors, createCustomIcon } from "../icons";
import { useSelector, useDispatch } from "react-redux";
import { setShowFilterPanel } from "../state/AppSlice";
import type { TimeFilter } from "../state/AppSlice";
import L from "leaflet";

// Time filtering helper function
function filterEventsByTime(events: any[], timeFilter: TimeFilter) {
  if (timeFilter.type === "all") return events;

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  return events.filter((event: any) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    
    switch (timeFilter.type) {
      case "today": {
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        return eventStart <= endOfToday && eventEnd >= now;
      }
      case "tomorrow": {
        const startOfTomorrow = new Date(now);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        return eventStart <= endOfTomorrow && eventEnd >= startOfTomorrow;
      }
      case "weekend": {
        // Find next Saturday and Sunday
        const dayOfWeek = now.getDay();
        const daysUntilSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
        const saturday = new Date(now);
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        const sunday = new Date(saturday);
        sunday.setDate(sunday.getDate() + 1);
        sunday.setHours(23, 59, 59, 999);
        return eventStart <= sunday && eventEnd >= saturday;
      }
      case "custom": {
        if (!timeFilter.startDate || !timeFilter.endDate) return true;
        const filterStart = new Date(timeFilter.startDate);
        const filterEnd = new Date(timeFilter.endDate);
        filterEnd.setHours(23, 59, 59, 999);
        return eventStart <= filterEnd && eventEnd >= filterStart;
      }
      default:
        return true;
    }
  });
}

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
      map.setView([lat, lng], 18, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedEvent, map]);

  return null;
}

function CenterMapOnSpot() {
  const map = useMap();
  const selectedSpot = useSelector(
    (state: RootState) => state.app.selectedSpot
  );
  const [highlightedSpotId, setHighlightedSpotId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedSpot && selectedSpot.location && selectedSpot.location.length >= 2) {
      const lat = selectedSpot.location[0];
      const lng = selectedSpot.location[1];
      
      // Center map on spot location
      map.setView([lat, lng], 18, {
        animate: true,
        duration: 0.5,
      });
      
      // Highlight the spot with cyan border
      setHighlightedSpotId(selectedSpot.id);
      
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedSpotId(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedSpot, map]);

  // Render cyan circle around highlighted spot
  if (highlightedSpotId && selectedSpot && selectedSpot.location) {
    const map = useMap();
    // Convert coordinate to pixel
    const point = map.latLngToContainerPoint([selectedSpot.location[0], selectedSpot.location[1]]);
    point.y -= 30;
    point.x -= 10;
    const adjustedLatLng = map.containerPointToLatLng(point);
    
    return (
      <CircleMarker
        center={[adjustedLatLng.lat, adjustedLatLng.lng]}
        radius={16}
        pathOptions={{
          color: 'cyan',
          fillColor: 'transparent',
          weight: 3,
        }}
      />
    );
  }

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
}: {
  onSelectSpot: (item: any, type: "spot" | "event") => void;
}) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const dispatch = useDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const onChooseLocation = useAppSelector(
    (state: RootState) => state.app.onChooseLocation
  );
  const currentUserLocation = useAppSelector(
    (state: RootState) => state.app.currentUserLocation
  );
  const showFilterPanel = useAppSelector(
    (state: RootState) => state.app.showFilterPanel
  );
  const mapFilters = useAppSelector(
    (state: RootState) => state.app.mapFilters
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

  const handleToggleFilter = () => {
    dispatch(setShowFilterPanel(!showFilterPanel));
  };

  const hasActiveFilters = 
    mapFilters.spotCategories.length > 0 || 
    mapFilters.eventCategories.length > 0 ||
    mapFilters.timeFilter.type !== "all";

  
  // Get events from Redux
  const events = useSelector((state: RootState) => state.events.events);

  // Fetch spots based on current map bounds
  const { spots, total, isPending: spotsLoading, fetchCheck } = useSpots();
  useEvents();
  
  // Apply filters to spots
  const filteredSpots = spots?.filter((spot) => {
    if (mapFilters.spotCategories.length === 0) return true;
    return mapFilters.spotCategories.includes(spot.category || "default");
  });

  // Filter out pending events (except for user profile and admin dashboard)
  const nonPendingEvents = events?.filter((event: any) => event.status !== 'pending');

  // Apply category filter to events
  const categoryFilteredEvents = nonPendingEvents?.filter((event: any) => {
    if (mapFilters.eventCategories.length === 0) return true;
    return mapFilters.eventCategories.includes(event.category || "default");
  });

  // Apply time filter to events
  const filteredEvents = filterEventsByTime(
    categoryFilteredEvents || [],
    mapFilters.timeFilter
  );
  
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
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />

        <InvalidateMapSize onLoaded={(v) => setMapLoaded(v)} />
        <MapCursor cursor={onChooseLocation ? "crosshair" : "pointer"} />
        <CenterMapOnEvent />
        <CenterMapOnSpot />
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
        {/* Memoize spot icons by category */}
        {(() => {
          const spotIconCache: Record<string, L.DivIcon> = {};
          return fetchCheck.shouldFetch && filteredSpots?.map((spot) => {
            const cat = spot.category || 'default';
            if (!spotIconCache[cat]) {
              const iconType = categoryIcons[cat] || categoryIcons.default;
              const iconColor = categoryColors[cat] || categoryColors.default;
              spotIconCache[cat] = createCustomIcon(iconType, iconColor);
            }
            const markerIcon = spotIconCache[cat];
            return (
              <Marker
                key={`spot-${spot.id}`}
                position={[spot.location[0], spot.location[1]]}
                icon={markerIcon}
                eventHandlers={{ click: () => onSelectSpot(spot, "spot") }}
              >
              </Marker>
            );
          });
        })()}

        {/* Show events */}
        {/* Create eventIcon once for all event markers */}
        {(() => {
          const eventIcon = createCustomIcon(categoryIcons.event, '', { isEvent: true });
          return fetchCheck.shouldFetch && filteredEvents?.map((event: any) => (
            <Marker
              key={`event-${event.id}`}
              position={[event.location[0], event.location[1]]}
              icon={eventIcon}
              zIndexOffset={1000}
              eventHandlers={{ click: () => onSelectSpot(event) }}
            >
              <Popup>
                <div>
                  <strong>{event.name}</strong>
                  <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Event</span>
                  {event.description && (
                    <div className="text-sm text-gray-600">{event.description}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {event.category} • {new Date(event.start_time).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </Popup>
            </Marker>
          ));
        })()}
      </MapContainer>

      {/* Filter Panel */}
      {showFilterPanel && <FilterPanel />}

      {/* Filter button - top right */}
      <div className="absolute top-8 right-8 z-40 group">
        <button
          onClick={handleToggleFilter}
          data-filter-toggle
          className={`text-gray-700 p-4 rounded-full shadow-md hover:shadow-lg transition-all ${
            hasActiveFilters 
              ? "bg-blue-500 text-white border-2 border-blue-600" 
              : "bg-white border-2 border-gray-300 hover:border-gray-400"
          }`}
        >
          <Filter size={24} />
        </button>
        <div className="absolute top-full right-0 mt-2 bg-white px-4 py-2 rounded-lg shadow-md text-sm text-gray-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Filter map
        </div>
      </div>

      {/* Location button - always visible */}
      <div className="absolute bottom-8 right-8 z-40 group">
        <button
          onClick={handleCenterOnLocation}
          className="bg-white text-gray-700 border-2 border-gray-300 p-4 rounded-full shadow-md hover:border-gray-400 hover:shadow-lg transition-all"
        >
          <Navigation size={24} />
        </button>
        <div className="absolute bottom-full right-0 mb-2 bg-white px-4 py-2 rounded-lg shadow-md text-sm text-gray-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          My location
        </div>
      </div>

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

      {/* Spots & Events count indicator */}
      {fetchCheck.shouldFetch && !spotsLoading && ((filteredSpots && filteredSpots.length > 0) || (filteredEvents && filteredEvents.length > 0)) && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-md z-50 text-sm text-gray-700 font-medium">
          {filteredSpots?.length || 0} spot{filteredSpots?.length !== 1 ? 's' : ''}, {filteredEvents?.length || 0} event{filteredEvents?.length !== 1 ? 's' : ''} visible
          {hasActiveFilters && <span className="ml-2 text-blue-600">(filtered)</span>}
        </div>
      )}
    </div>
  );
}
