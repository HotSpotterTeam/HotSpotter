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
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/events`);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      const json = await response.json();
      console.log("Events API response:", json);
      return json;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (data) {
      console.log("Dispatching events to store:", data);
      // Handle both response formats: { data: Event[] } or Event[] directly
      const events = Array.isArray(data) ? data : (data.data || []);
      dispatch(setEvents(events as Event[]));
    }
  }, [data, dispatch]);

  return { isPending, error, data: data?.data as Event[] || (Array.isArray(data) ? data : []) };
}
