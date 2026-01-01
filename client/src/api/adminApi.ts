import { StatData, User, Spot, Event, Report } from "../generated-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// --- Internal Helper ---
const authFetch = async <T>(token: string | null, endpoint: string, options: RequestInit = {}): Promise<T> => {
  const headers = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}` 
  };
  
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  
  if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${res.statusText}`);
  }
  return res.json(); // Returns the parsed JSON (e.g. { status: "success", data: ... })
};

// --- Exported API Functions ---

// 1. Stats
export const getStats = async (token: string | null) => {
  const res: any = await authFetch(token, "/api/admin/stats");
  return res.data as StatData;
};

// 2. Users
export const getUsers = async (token: string | null, search: string, onlyAdmins: boolean) => {
  let url = "/api/admin/users?";
  if (search) url += `search=${search}&`;
  if (onlyAdmins) url += `is_admin=true&`;
  
  // The backend returns a list directly for this endpoint
  return authFetch<User[]>(token, url); 
};

export const deleteUser = async (token: string | null, id: number) => {
  return authFetch(token, `/api/admin/users/${id}`, { method: "DELETE" });
};

export const toggleUserRole = async (token: string | null, id: number) => {
  return authFetch(token, `/api/admin/users/${id}/role`, { method: "PUT" });
};

// 3. Spots
export const getSpots = async (token: string | null, search: string, filter: "all" | "approved" | "pending") => {
  let url = "/api/spots/?";
  if (search) url += `search=${search}&`;
  if (filter === "approved") url += `is_approved=true&`;
  if (filter === "pending") url += `is_approved=false&`;
  
  const res: any = await authFetch(token, url);
  // API returns { spots: [...], total: ... }
  return res.spots as Spot[];
};

export const deleteSpot = async (token: string | null, id: number) => {
  return authFetch(token, `/api/spots/${id}`, { method: "DELETE" });
};

export const approveSpot = async (token: string | null, id: number) => {
  return authFetch(token, `/api/spots/${id}/approve`, { method: "PUT" });
};

// 4. Events
export const getEvents = async (token: string | null, search: string, filter: "all" | "active" | "pending") => {
  let url = "/api/events/?";
  if (search) url += `search=${search}&`;
  url += `status=${filter}&`; 
  
  const res: any = await authFetch(token, url);
  return res.data as Event[];
};

export const deleteEvent = async (token: string | null, id: number) => {
  return authFetch(token, `/api/events/${id}`, { method: "DELETE" });
};

// 5. Reports
export const getReports = async (token: string | null) => {
  const res: any = await authFetch(token, "/api/reports/?is_flagged=true");
  return res.data as Report[];
};

export const dismissReport = async (token: string | null, id: number) => {
  return authFetch(token, `/api/reports/${id}/flag`, { method: "DELETE" });
};