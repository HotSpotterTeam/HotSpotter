import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Event } from "../generated-types";
import { Bounds } from "../queries";

interface EventsState {
  // All loaded events, keyed by ID for fast lookup and deduplication
  eventsById: Record<number, Event>;
  // For backwards compatibility - derived array
  events: Event[];
}

const initialState: EventsState = {
  eventsById: {},
  events: [],
};

export const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    // Replace events for current view (existing behavior for compatibility)
    setEvents: (state, action: PayloadAction<Event[]>) => {
      const events = action.payload;
      // Merge into eventsById
      for (const event of events) {
        state.eventsById[event.id] = event;
      }
      // Update the array (derived from map for current view)
      state.events = events;
    },

    // Merge new events into the cache
    mergeEvents: (state, action: PayloadAction<Event[]>) => {
      for (const event of action.payload) {
        state.eventsById[event.id] = event;
      }
      // Update derived array
      state.events = Object.values(state.eventsById);
    },

    addEvent: (state, action: PayloadAction<Event>) => {
      const event = action.payload;
      state.eventsById[event.id] = event;
      state.events = Object.values(state.eventsById);
    },

    updateEvent: (state, action: PayloadAction<Event>) => {
      const event = action.payload;
      state.eventsById[event.id] = event;
      state.events = Object.values(state.eventsById);
    },

    deleteEvent: (state, action: PayloadAction<number>) => {
      delete state.eventsById[action.payload];
      state.events = Object.values(state.eventsById);
    },

    clearEvents: (state) => {
      state.eventsById = {};
      state.events = [];
    },
  },
});

export const { setEvents, mergeEvents, addEvent, updateEvent, deleteEvent, clearEvents } =
  eventsSlice.actions;

export default eventsSlice.reducer;
