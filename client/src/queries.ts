import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { setEvents } from "./state/EventsSlice";

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
      dispatch(setEvents(data));
    }
  }, [data]);

  return { isPending, error, data };
}
