import { Event } from "../generated-types";

// Get the base URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// --- Helper for Public Requests (No Token Needed) ---
const publicFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const headers = { 
      "Content-Type": "application/json",
      ...options.headers 
  };
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${res.statusText}`);
  }
  return res.json();
};

// --- Exported API Functions ---

/**
 * Search for events by name or description.
 * If query is empty, it returns all active events (or you could return empty array).
 */
export const searchEvents = async (query: string) => {
  // Use the same search param we implemented in the backend
  const url = `/api/events/?search=${encodeURIComponent(query)}&status=all`;
  
  const res: any = await publicFetch(url);
  // Backend returns { status: "success", data: [...] }
  return res.data as Event[];
};