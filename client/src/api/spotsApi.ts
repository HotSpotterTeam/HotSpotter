import { Spot } from "../generated-types";

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
 * Search for spots by name or description.
 * If query is empty, it returns all approved spots (or you could return empty array).
 */
export const searchSpots = async (query: string) => {
  // Use the search param for spots endpoint
  const url = `/api/spots/?search=${encodeURIComponent(query)}&is_approved=true`;
  
  const res: any = await publicFetch(url);
  // Backend returns { spots: [...], total: number }
  return res.spots as Spot[];
};
