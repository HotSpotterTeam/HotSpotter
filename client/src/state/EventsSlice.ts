import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Event } from "../generated-types";
import { Bounds } from "../queries";

interface EventsState {
  // All loaded events, keyed by ID for fast lookup and deduplication
  eventsById: Record<number, Event>;
  // Track which regions have been loaded (list of bounding boxes)
  loadedRegions: Bounds[];
  // Total count from server (for the current view)
  totalInView: number;
}

const initialState: EventsState = {
  eventsById: {},
  loadedRegions: [],
  totalInView: 0,
};

export const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    // Merge new events into the cache with region tracking
    mergeEvents: (state, action: PayloadAction<{ events: Event[]; bounds: Bounds; total: number }>) => {
      const { events, bounds, total } = action.payload;

      // Add/update events by ID
      for (const event of events) {
        state.eventsById[event.id] = event;
      }

      // Track this region as loaded
      state.loadedRegions.push(bounds);

      // Keep only last 10 regions to prevent memory bloat
      if (state.loadedRegions.length > 10) {
        state.loadedRegions = state.loadedRegions.slice(-10);
      }

      state.totalInView = total;
    },

    // Update a single event (e.g., after editing)
    updateEvent: (state, action: PayloadAction<Event>) => {
      const event = action.payload;
      state.eventsById[event.id] = event;
    },

    // Add a new event
    addEvent: (state, action: PayloadAction<Event>) => {
      const event = action.payload;
      state.eventsById[event.id] = event;
    },

    // Remove an event
    deleteEvent: (state, action: PayloadAction<number>) => {
      delete state.eventsById[action.payload];
    },

    // Clear all cached data (e.g., on logout or refresh)
    clearEvents: (state) => {
      state.eventsById = {};
      state.loadedRegions = [];
      state.totalInView = 0;
    },
  },
});

// Helper to check if a region is already loaded
export function isEventRegionLoaded(loadedRegions: Bounds[], bounds: Bounds): boolean {
  // Check if any loaded region fully contains the requested bounds
  return loadedRegions.some(region =>
    region.minLat <= bounds.minLat &&
    region.maxLat >= bounds.maxLat &&
    region.minLng <= bounds.minLng &&
    region.maxLng >= bounds.maxLng
  );
}

// Helper to get events within bounds from cache
export function getEventsInBounds(eventsById: Record<number, Event>, bounds: Bounds): Event[] {
  return Object.values(eventsById).filter(event => {
    if (!event.location || event.location.length < 2) return false;
    const [lat, lng] = event.location;
    return (
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
    );
  });
}

export const { mergeEvents, addEvent, updateEvent, deleteEvent, clearEvents } =
  eventsSlice.actions;

export default eventsSlice.reducer;
