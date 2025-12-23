import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setEvents } from "./state/EventsSlice";
import { Event } from "./generated-types";

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export function useEvents() {
  const dispatch = useDispatch();
  const { isPending, error, data } = useQuery({
    queryKey: ["events"],
    queryFn: () => fetch(`${API_URL}/api/events`).then((res) => res.json()),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (data) {
      dispatch(setEvents(data.data as Event[]));
    }
  }, [data]);

  return { isPending, error, data: data?.data as Event[] };
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

export function useSpots(bounds?: Bounds, enabled = true) {
  const queryKey = bounds
    ? ["spots", bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng]
    : ["spots"];

  const { isPending, error, data, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let url = `${API_URL}/api/spots/`;
      
      if (bounds) {
        const params = new URLSearchParams({
          min_lat: bounds.minLat.toString(),
          max_lat: bounds.maxLat.toString(),
          min_lng: bounds.minLng.toString(),
          max_lng: bounds.maxLng.toString(),
        });
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch spots');
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    enabled,
  });

  return { 
    isPending, 
    error, 
    spots: data?.spots as Spot[] || [], 
    total: data?.total || 0,
    refetch 
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
