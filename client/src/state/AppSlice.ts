import { createSlice } from "@reduxjs/toolkit";

export const appSlice = createSlice({
  name: "app",
  initialState: {
    selectedSpot: null as Event | null,
    showCreateSpot: false as boolean,
    isLoading: false as boolean,
    error: null as string | null,
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
  },
});

export const { setSelectedSpot, setShowCreateSpot, setIsLoading, setError } =
  appSlice.actions;

export default appSlice.reducer;
