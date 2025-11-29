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
  event_id: number;
  user_id: number;
  description: string;
  date: string;
  time: string;
  category: string;
  status: string;
}
export interface ReportResponse {
  status: string;
  data: Report;
}
