import { createSlice } from "@reduxjs/toolkit";
import { Event, Spot } from "../generated-types";
import { Bounds } from "../queries";

export type Location = {
  lat: number;
  lng: number;
};

export const appSlice = createSlice({
  name: "app",
  initialState: {
    selectedSpot: null as Spot | null,
    selectedEvent: null as Event | null,
    showCreateSpot: false as boolean,
    isLoading: false as boolean,
    error: null as string | null,
    onChooseLocation: false as boolean,
    createSpotLocation: null as Location | null,
    currentUserLocation: null as Location | null,
    showAdminDashboard: false as boolean,
    showUserProfile: false as boolean,
    mapBounds: null as Bounds | null,
    mapZoom: 13 as number,
    shouldFetchSpots: true as boolean,
  },
  reducers: {
    setSelectedSpot: (state, action) => {
      state.selectedSpot = action.payload as Spot | null;
    },
    setSelectedEvent: (state, action) => {
      state.selectedEvent = action.payload as Event | null;
    },
    setShowCreateSpot: (state, action) => {
      state.showCreateSpot = action.payload as boolean;
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload as boolean;
    },
    setError: (state, action) => {
      state.error = action.payload as string | null;
    },
    setOnChooseLocation: (state, action) => {
      state.onChooseLocation = action.payload as boolean;
    },
    setCreateSpotLocation: (state, action) => {
      state.createSpotLocation = action.payload as Location | null;
    },
    setCurrentUserLocation: (state, action) => {
      state.currentUserLocation = action.payload as Location | null;
    },
    setShowAdminDashboard: (state, action) => {
      state.showAdminDashboard = action.payload as boolean;
    },
    setShowUserProfile: (state, action) => {
      state.showUserProfile = action.payload as boolean;
    },
    setMapBounds: (state, action) => {
      state.mapBounds = action.payload as Bounds | null;
    },
    setMapZoom: (state, action) => {
      state.mapZoom = action.payload as number;
    },
    setShouldFetchSpots: (state, action) => {
      state.shouldFetchSpots = action.payload as boolean;
    },
  },
});

export const {
  setSelectedSpot,
  setSelectedEvent,
  setShowCreateSpot,
  setIsLoading,
  setError,
  setOnChooseLocation,
  setCreateSpotLocation,
  setCurrentUserLocation,
  setShowAdminDashboard,
  setShowUserProfile,
  setMapBounds,
  setMapZoom,
  setShouldFetchSpots,
} = appSlice.actions;

export default appSlice.reducer;
