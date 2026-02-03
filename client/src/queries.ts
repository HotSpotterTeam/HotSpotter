import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useEffect, useMemo } from "react";
import { mergeEvents, isEventRegionLoaded, getEventsInBounds } from "./state/EventsSlice";
import { mergeSpots, isRegionLoaded, getSpotsInBounds } from "./state/SpotsSlice";
import { Event, Spot } from "./generated-types";
import { useAppSelector } from "./store/hooks";
import { RootState } from "./state/store";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

// Expand bounds by a percentage to pre-fetch nearby areas
function expandBounds(bounds: Bounds, expansionFactor: number = 0.3): Bounds {
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  const latExpansion = latRange * expansionFactor;
  const lngExpansion = lngRange * expansionFactor;

  return {
    minLat: bounds.minLat - latExpansion,
    maxLat: bounds.maxLat + latExpansion,
    minLng: bounds.minLng - lngExpansion,
    maxLng: bounds.maxLng + lngExpansion,
  };
}

export function useEvents() {
  const dispatch = useDispatch();
  const mapBounds = useAppSelector((state: RootState) => state.app.mapBounds);

  // Get cached data from Redux
  const eventsById = useAppSelector((state: RootState) => state.events.eventsById);
  const loadedRegions = useAppSelector((state: RootState) => state.events.loadedRegions);
  const totalInView = useAppSelector((state: RootState) => state.events.totalInView);

  // Expand bounds to pre-fetch nearby areas (50% expansion)
  const fetchBounds = mapBounds ? expandBounds(mapBounds, 0.5) : null;

  // Check if we already have data for this region
  const regionAlreadyLoaded = fetchBounds ? isEventRegionLoaded(loadedRegions, fetchBounds) : false;

  // Only include bounds in query key if region not loaded yet
  const queryKey = fetchBounds && !regionAlreadyLoaded
    ? ["events", "fetch", fetchBounds.minLat, fetchBounds.maxLat, fetchBounds.minLng, fetchBounds.maxLng]
    : ["events", "cached"];

  const { isPending, error, data, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      // If region already loaded, don't fetch
      if (regionAlreadyLoaded || !fetchBounds) {
        return { events: [], total: totalInView, fromCache: true };
      }

      let url = `${API_URL}/api/events/`;

      const params = new URLSearchParams({
        min_lat: fetchBounds.minLat.toString(),
        max_lat: fetchBounds.maxLat.toString(),
        min_lng: fetchBounds.minLng.toString(),
        max_lng: fetchBounds.maxLng.toString(),
        status: 'all',
        limit: '500',
      });
      url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      const json = await response.json();
      const events = Array.isArray(json) ? json : (json.data || []);
      return { events, total: json.total || events.length, bounds: fetchBounds, fromCache: false };
    },
    staleTime: 1000 * 60 * 30, // Consider stale after 30 minutes
    enabled: mapBounds !== null && !regionAlreadyLoaded,
  });

  // Merge new events into cache when data arrives
  useEffect(() => {
    if (data && !data.fromCache && data.events && data.bounds) {
      dispatch(mergeEvents({
        events: data.events as Event[],
        bounds: data.bounds,
        total: data.total || 0,
      }));
    }
  }, [data, dispatch]);

  // Get events for current view from cache
  const eventsInView = useMemo(() => {
    if (!mapBounds) return [];
    return getEventsInBounds(eventsById, mapBounds);
  }, [eventsById, mapBounds]);

  return {
    isPending: isPending && !regionAlreadyLoaded,
    error,
    data: eventsInView,
    total: eventsInView.length,
    refetch,
  };
}

export function useSpots() {
  const dispatch = useDispatch();
  const mapBounds = useAppSelector((state: RootState) => state.app.mapBounds);
  const mapZoom = useAppSelector((state: RootState) => state.app.mapZoom);

  // Get cached data from Redux
  const spotsById = useAppSelector((state: RootState) => state.spots.spotsById);
  const loadedRegions = useAppSelector((state: RootState) => state.spots.loadedRegions);
  const totalInView = useAppSelector((state: RootState) => state.spots.totalInView);

  // Expand bounds to pre-fetch nearby areas (50% expansion)
  const fetchBounds = mapBounds ? expandBounds(mapBounds, 0.5) : null;

  // Check if we already have data for this region
  const regionAlreadyLoaded = fetchBounds ? isRegionLoaded(loadedRegions, fetchBounds) : false;

  // Only include bounds in query key if region not loaded yet
  // This prevents refetching when we already have the data
  const queryKey = fetchBounds && !regionAlreadyLoaded
    ? ["spots", "fetch", fetchBounds.minLat, fetchBounds.maxLat, fetchBounds.minLng, fetchBounds.maxLng]
    : ["spots", "cached"];

  const { isPending, error, data, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      // If region already loaded, don't fetch
      if (regionAlreadyLoaded || !fetchBounds) {
        return { spots: [], total: totalInView, fromCache: true };
      }

      let url = `${API_URL}/api/spots/`;

      const params = new URLSearchParams({
        min_lat: fetchBounds.minLat.toString(),
        max_lat: fetchBounds.maxLat.toString(),
        min_lng: fetchBounds.minLng.toString(),
        max_lng: fetchBounds.maxLng.toString(),
        is_approved: 'true',
        limit: '500',
      });
      url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch spots');
      const json = await res.json();
      return { ...json, bounds: fetchBounds, fromCache: false };
    },
    staleTime: 1000 * 60 * 30, // Consider stale after 30 minutes
    enabled: mapBounds !== null && !regionAlreadyLoaded,
  });

  // Merge new spots into cache when data arrives
  useEffect(() => {
    if (data && !data.fromCache && data.spots && data.bounds) {
      dispatch(mergeSpots({
        spots: data.spots,
        bounds: data.bounds,
        total: data.total || 0,
      }));
    }
  }, [data, dispatch]);

  // Get spots for current view from cache
  const spotsInView = useMemo(() => {
    if (!mapBounds) return [];
    return getSpotsInBounds(spotsById, mapBounds);
  }, [spotsById, mapBounds]);

  // Check if we should display spots based on zoom level and count
  const fetchCheck = shouldFetchSpots(mapZoom, spotsInView.length);

  return {
    isPending: isPending && !regionAlreadyLoaded,
    error,
    spots: spotsInView,
    total: spotsInView.length,
    refetch,
    fetchCheck
  };
}

// Function to check if we should fetch spots based on zoom level
export function shouldFetchSpots(zoom: number, spotCount?: number): { shouldFetch: boolean; message?: string } {
  if (zoom < 10) {
    return { shouldFetch: false, message: "Zoom in to see spots" };
  }

  if (spotCount && spotCount > 500) {
    return { shouldFetch: false, message: "Too many spots. Zoom in to see details" };
  }

  return { shouldFetch: true };
}
