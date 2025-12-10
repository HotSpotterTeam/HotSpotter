import { createSlice } from "@reduxjs/toolkit";

export type Location = {
  lat: number;
  lng: number;
};

export const appSlice = createSlice({
  name: "app",
  initialState: {
    selectedSpot: null as Event | null,
    showCreateSpot: false as boolean,
    isLoading: false as boolean,
    error: null as string | null,
    onChooseLocation: false as boolean,
    createSpotLocation: null as Location | null,
    currentUserLocation: null as Location | null,
  },
  reducers: {
    setSelectedSpot: (state, action) => {
      state.selectedSpot = action.payload as Event | null;
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
  },
});

export const {
  setSelectedSpot,
  setShowCreateSpot,
  setIsLoading,
  setError,
  setOnChooseLocation,
  setCreateSpotLocation,
  setCurrentUserLocation,
} = appSlice.actions;

export default appSlice.reducer;
