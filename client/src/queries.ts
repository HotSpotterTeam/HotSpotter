import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setEvents } from "./state/EventsSlice";
import { Event } from "./generated-types";
import { useAppSelector } from "./store/hooks";
import { RootState } from "./state/store";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export function useEvents() {
  const dispatch = useDispatch();
  // 1. Listen to map bounds (Just like useSpots)
  const mapBounds = useAppSelector((state: RootState) => state.app.mapBounds);

  // 2. Add bounds to the cache key so it refetches when map moves
  const queryKey = mapBounds
    ? ["events", mapBounds.minLat, mapBounds.maxLat, mapBounds.minLng, mapBounds.maxLng]
    : ["events"];

  const { isPending, error, data } = useQuery({
    queryKey,
    queryFn: async () => {
      let url = `${API_URL}/api/events/`;

      // 3. Append Bounding Box params if they exist
      if (mapBounds) {
        const params = new URLSearchParams({
          min_lat: mapBounds.minLat.toString(),
          max_lat: mapBounds.maxLat.toString(),
          min_lng: mapBounds.minLng.toString(),
          max_lng: mapBounds.maxLng.toString(),
          status: 'all'
        });
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      const json = await response.json();
      return json;
    },
    staleTime: 1000 * 60 * 5, 
    enabled: true, // You can add mapBounds !== null if you want to wait for map load
  });

  useEffect(() => {
    if (data) {
      // Handle response format
      const events = Array.isArray(data) ? data : (data.data || []);
      dispatch(setEvents(events as Event[]));
    }
  }, [data, dispatch]);

  return { isPending, error, data: data?.data as Event[] || (Array.isArray(data) ? data : []) };
}

export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type Spot = {
  id: number;
  name: string;
  description?: string;
  location: [number, number]; // [lat, lng]
  category: string;
  is_approved: boolean;
  spot_type: string;
  address?: string;
};

export function useSpots() {
  const mapBounds = useAppSelector((state: RootState) => state.app.mapBounds);
  const mapZoom = useAppSelector((state: RootState) => state.app.mapZoom);
  
  const queryKey = mapBounds
    ? ["spots", mapBounds.minLat, mapBounds.maxLat, mapBounds.minLng, mapBounds.maxLng]
    : ["spots"];

  const { isPending, error, data, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let url = `${API_URL}/api/spots/`;
      
      if (mapBounds) {
        const params = new URLSearchParams({
          min_lat: mapBounds.minLat.toString(),
          max_lat: mapBounds.maxLat.toString(),
          min_lng: mapBounds.minLng.toString(),
          max_lng: mapBounds.maxLng.toString(),
          is_approved: 'true', // Only show approved spots on the map
        });
        url += `?${params.toString()}`;
      } else {
        url += '?is_approved=true'; // Only show approved spots
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch spots');
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    enabled: mapBounds !== null,
  });
  
  const total = data?.total || 0;
  const spots = data?.spots as Spot[] || [];
  
  // Check if we should display spots based on zoom level and count
  const fetchCheck = shouldFetchSpots(mapZoom, total);

  return { 
    isPending, 
    error, 
    spots, 
    total,
    refetch,
    fetchCheck
  };
}

// Function to check if we should fetch spots based on zoom level
export function shouldFetchSpots(zoom: number, spotCount?: number): { shouldFetch: boolean; message?: string } {
  // Too zoomed out
  if (zoom < 13) {
    return { shouldFetch: false, message: "Zoom in to see spots" };
  }
  
  // If we have count and it's too many
  if (spotCount && spotCount > 500) {
    return { shouldFetch: false, message: "Too many spots. Zoom in to see details" };
  }
  
  return { shouldFetch: true };
}
