import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Circle,
  CircleMarker,
} from "react-leaflet";
import { Navigation, AlertCircle, Filter } from "lucide-react";
import SpotMarkers from "./SpotMarkers";
import EventMarkers from "./EventMarkers";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../state/store";
import MapEvents from "./MapEvents";
import FilterPanel from "./FilterPanel";
import { useSpots, useEvents } from "../queries";
import { TEL_AVIV_DEFAULT } from "../constants";
import { useSelector, useDispatch } from "react-redux";
import { setShowFilterPanel } from "../state/AppSlice";
import type { TimeFilter } from "../state/AppSlice";

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Time filtering helper function
function filterEventsByTime(events: any[], timeFilter: TimeFilter) {
  if (timeFilter.type === "all") return events;

  const now = new Date();
  const nowForToday = new Date();
  nowForToday.setHours(0, 0, 0, 0);

  return events.filter((event: any) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    switch (timeFilter.type) {
      case "active": {
        // Filter events that are happening right now (active status)
        return event.status === "active" && eventStart <= now && eventEnd >= now;
      }
      case "today": {
        const endOfToday = new Date(nowForToday);
        endOfToday.setHours(23, 59, 59, 999);
        return eventStart <= endOfToday && eventEnd >= nowForToday;
      }
      case "tomorrow": {
        const startOfTomorrow = new Date(nowForToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        return eventStart <= endOfTomorrow && eventEnd >= startOfTomorrow;
      }
      case "weekend": {
        const dayOfWeek = nowForToday.getDay();
        // Friday is 5, Saturday is 6
        const daysUntilFriday = dayOfWeek === 5 ? 0 : dayOfWeek === 6 ? 6 : (5 - dayOfWeek + 7) % 7;
        const friday = new Date(nowForToday);
        friday.setDate(friday.getDate() + daysUntilFriday);
        const saturday = new Date(friday);
        saturday.setDate(saturday.getDate() + 1);
        saturday.setHours(23, 59, 59, 999);
        return eventStart <= saturday && eventEnd >= friday;
      }
      case "custom": {
        if (!timeFilter.startDate || !timeFilter.endDate) return true;
        const filterStart = new Date(timeFilter.startDate);
        const filterEnd = new Date(timeFilter.endDate);
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

    const checkLoaded = () => {
      if (map.getContainer().querySelector(".leaflet-tile-loaded")) {
        callLoaded();
      }
    };

    checkLoaded();
    const checkTimeout = setTimeout(checkLoaded, 100);

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
      const lat = selectedEvent.location[0];
      const lng = selectedEvent.location[1];
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
    const spot = selectedSpot as any;

    if (spot && spot.location && spot.location.length >= 2) {
      const lat = spot.location[0];
      const lng = spot.location[1];

      map.setView([lat, lng], 18, {
        animate: true,
        duration: 0.5,
      });

      setHighlightedSpotId(spot.id);

      const timer = setTimeout(() => {
        setHighlightedSpotId(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [selectedSpot, map]);

  const spot = selectedSpot as any;
  if (!highlightedSpotId || !spot || !spot.location) {
    return null;
  }

  const point = map.latLngToContainerPoint([spot.location[0], spot.location[1]]);
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

function CenterOnUserLocationHandler({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
}

export default function MapView({
  onSelectSpot,
  onChooseLocation,
}: {
  onSelectSpot: (spot: any, type: "spot" | "event") => void;
  onChooseLocation?: { enabled: boolean; callback: (lat: number, lng: number) => void } | null;
}) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const currentUserLocation = useAppSelector((state) => state.app.currentUserLocation);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const dispatch = useDispatch();
  const mapFilters = useAppSelector((state) => state.app.mapFilters);
  const showFilterPanel = useAppSelector((state) => state.app.showFilterPanel);

  const handleCenterOnLocation = () => {
    if (!mapInstance) return;

    if (currentUserLocation) {
      mapInstance.setView([currentUserLocation.lat, currentUserLocation.lng], 16, {
        animate: true,
        duration: 0.5,
      });
    } else {
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
    mapFilters.timeFilter.type !== "all" ||
    mapFilters.distanceFilter.enabled;


  const events = useSelector((state: RootState) => state.events.events);

  const { spots, total, isPending: spotsLoading, fetchCheck } = useSpots();
  useEvents();

  // Apply category filter first
  const categoryFilteredSpots = spots?.filter((spot) => {
    if (mapFilters.spotCategories.length === 0) return true;
    return mapFilters.spotCategories.includes(spot.category || "default");
  });

  // Apply distance filter to spots
  const filteredSpots = categoryFilteredSpots?.filter((spot) => {
    if (!mapFilters.distanceFilter.enabled) return true;

    const center = mapFilters.distanceFilter.fromLocation === "current"
      ? currentUserLocation
      : mapFilters.distanceFilter.customLocation;

    if (!center || !spot.location || spot.location.length < 2) return true;

    const distance = calculateDistance(
      center.lat,
      center.lng,
      spot.location[0],
      spot.location[1]
    );

    return distance <= mapFilters.distanceFilter.radius;
  });

  const nonPendingEvents = events?.filter((event: any) =>
    event.status !== 'pending' && event.status !== 'completed'
  );

  const categoryFilteredEvents = nonPendingEvents?.filter((event: any) => {
    if (mapFilters.eventCategories.length === 0) return true;
    return mapFilters.eventCategories.includes(event.category || "default");
  });

  const timeFilteredEvents = filterEventsByTime(
    categoryFilteredEvents || [],
    mapFilters.timeFilter
  );

  // Apply distance filter to events
  const filteredEvents = timeFilteredEvents?.filter((event: any) => {
    if (!mapFilters.distanceFilter.enabled) return true;

    const center = mapFilters.distanceFilter.fromLocation === "current"
      ? currentUserLocation
      : mapFilters.distanceFilter.customLocation;

    if (!center || !event.location || event.location.length < 2) return true;

    const distance = calculateDistance(
      center.lat,
      center.lng,
      event.location[0],
      event.location[1]
    );

    return distance <= mapFilters.distanceFilter.radius;
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

        {/* Distance Filter Circle Overlay */}
        {mapFilters.distanceFilter.enabled && (() => {
          const center = mapFilters.distanceFilter.fromLocation === "current"
            ? currentUserLocation
            : mapFilters.distanceFilter.customLocation;

          if (center) {
            return (
              <>
                <Circle
                  center={[center.lat, center.lng]}
                  radius={mapFilters.distanceFilter.radius * 1000}
                  color="#3b82f6"
                  fillColor="#3b82f6"
                  fillOpacity={0.1}
                  opacity={0.6}
                  weight={2}
                />
                <CircleMarker
                  center={[center.lat, center.lng]}
                  radius={6}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.8,
                    weight: 2,
                  }}
                />
              </>
            );
          }
          return null;
        })()}

        {/* Clustered spot markers */}
        {fetchCheck.shouldFetch && <SpotMarkers spots={filteredSpots || []} onSelectSpot={onSelectSpot} />}

        {/* Clustered event markers */}
        {fetchCheck.shouldFetch && <EventMarkers events={filteredEvents || []} onSelectSpot={onSelectSpot} />}
      </MapContainer>

      {/* Filter Panel */}
      {showFilterPanel && <FilterPanel />}

      {/* Filter button */}
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

      {/* Location button */}
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
