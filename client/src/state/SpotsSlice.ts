import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Spot } from "../generated-types";
import { Bounds } from "../queries";

interface SpotsState {
  // All loaded spots, keyed by ID for fast lookup and deduplication
  spotsById: Record<number, Spot>;
  // Track which regions have been loaded (list of bounding boxes)
  loadedRegions: Bounds[];
  // Total count from server (for the current view)
  totalInView: number;
}

const initialState: SpotsState = {
  spotsById: {},
  loadedRegions: [],
  totalInView: 0,
};

export const spotsSlice = createSlice({
  name: "spots",
  initialState,
  reducers: {
    // Merge new spots into the cache (doesn't replace, adds/updates)
    mergeSpots: (state, action: PayloadAction<{ spots: Spot[]; bounds: Bounds; total: number }>) => {
      const { spots, bounds, total } = action.payload;

      // Add/update spots by ID
      for (const spot of spots) {
        state.spotsById[spot.id] = spot;
      }

      // Track this region as loaded (simplified - just add it)
      // In a more sophisticated implementation, you'd merge overlapping regions
      state.loadedRegions.push(bounds);

      // Keep only last 10 regions to prevent memory bloat
      if (state.loadedRegions.length > 10) {
        state.loadedRegions = state.loadedRegions.slice(-10);
      }

      state.totalInView = total;
    },

    // Update a single spot (e.g., after editing)
    updateSpot: (state, action: PayloadAction<Spot>) => {
      const spot = action.payload;
      state.spotsById[spot.id] = spot;
    },

    // Remove a spot
    removeSpot: (state, action: PayloadAction<number>) => {
      delete state.spotsById[action.payload];
    },

    // Clear all cached data (e.g., on logout or refresh)
    clearSpots: (state) => {
      state.spotsById = {};
      state.loadedRegions = [];
      state.totalInView = 0;
    },
  },
});

// Helper to check if a region is already loaded
export function isRegionLoaded(loadedRegions: Bounds[], bounds: Bounds): boolean {
  // Check if any loaded region fully contains the requested bounds
  return loadedRegions.some(region =>
    region.minLat <= bounds.minLat &&
    region.maxLat >= bounds.maxLat &&
    region.minLng <= bounds.minLng &&
    region.maxLng >= bounds.maxLng
  );
}

// Helper to get spots within bounds from cache
export function getSpotsInBounds(spotsById: Record<number, Spot>, bounds: Bounds): Spot[] {
  return Object.values(spotsById).filter(spot => {
    if (!spot.location || spot.location.length < 2) return false;
    const [lat, lng] = spot.location;
    return (
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
    );
  });
}

export const { mergeSpots, updateSpot, removeSpot, clearSpots } = spotsSlice.actions;

export default spotsSlice.reducer;
