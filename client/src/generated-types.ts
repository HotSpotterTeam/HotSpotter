/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

export interface CreateEvent {
  name: string;
  description: string;
  location: number[];
  date: string;
  time: string;
  category: string;
  status: string;
}
export interface Event {
  name: string;
  description: string;
  location: number[];
  date: string;
  time: string;
  category: string;
  status: string;
  id: number;
  start_time: string;
  end_time: string;
  spot_id?: number;
  owner_id?: number;
}
export interface EventResponse {
  status: string;
  data: Event;
}
export interface EventsResponse {
  status: string;
  data: Event[];
}
export interface Report {
  id: number;
  event_id?: number;
  spot_id?: number;
  user_id: number;
  user_name: string;
  description: string;
  date: string;
  time: string;
  category: string;
  status: string;
  is_flagged: boolean;
  score?: number;
  picture?: string;
}
export interface ReportResponse {
  status: string;
  data: Report;
}

export interface StatData {
  users: { total: number; admins: number; regular: number };
  spots: { total: number; approved: number; pending: number; by_category: any };
  events: { total: number; active: number; pending: number; by_category: any };
  reports: { total: number; flagged: number; on_spots: number; on_events: number };
}
export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface Spot {
  id: number;
  name: string;
  category: string;
  is_approved: boolean;
  owner_id: number;
  description?: string;
}