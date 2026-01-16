import React, { useState, useEffect } from "react";
import { Filter, Search as SearchIcon, X, Calendar, CircleDot } from "lucide-react";
import { RootState } from "../state/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEvent, setSelectedSpot, setShowFilterPanel } from "../state/AppSlice";
import { Event, Spot } from "../generated-types";
import * as EventsApi from "../api/eventsApi"; // Import the new API file
import * as SpotsApi from "../api/spotsApi"; // Import spots API
import { useAppSelector } from "../store/hooks";
import { useSpots } from "../queries";
import { categoryIcons, categoryColors } from "../icons";
import type { TimeFilter } from "../state/AppSlice";

// Time filtering helper function (same as MapView)
function filterEventsByTime(events: Event[], timeFilter: TimeFilter) {
  if (timeFilter.type === "all") return events;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return events.filter((event: Event) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    
    switch (timeFilter.type) {
      case "today": {
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        return eventStart <= endOfToday && eventEnd >= now;
      }
      case "tomorrow": {
        const startOfTomorrow = new Date(now);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        return eventStart <= endOfTomorrow && eventEnd >= startOfTomorrow;
      }
      case "weekend": {
        const dayOfWeek = now.getDay();
        const daysUntilSaturday = dayOfWeek === 6 ? 0 : dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
        const saturday = new Date(now);
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        const sunday = new Date(saturday);
        sunday.setDate(sunday.getDate() + 1);
        sunday.setHours(23, 59, 59, 999);
        return eventStart <= sunday && eventEnd >= saturday;
      }
      case "custom": {
        if (!timeFilter.startDate || !timeFilter.endDate) return true;
        const filterStart = new Date(timeFilter.startDate);
        const filterEnd = new Date(timeFilter.endDate);
        filterEnd.setHours(23, 59, 59, 999);
        return eventStart <= filterEnd && eventEnd >= filterStart;
      }
      default:
        return true;
    }
  });
}

export default function Sidebar({
  events: nearbyEvents,
  isLoading: isNearbyLoading,
  error: nearbyError,
}: {
  events: Event[];
  isLoading?: boolean;
  error?: Error | null;
}) {
  const dispatch = useDispatch();
  
  // --- Fetch Spots ---
  const { spots } = useSpots();
  
  // --- Get Map Filters from Redux ---
  const mapFilters = useAppSelector((state: RootState) => state.app.mapFilters);
  const showFilterPanel = useAppSelector((state: RootState) => state.app.showFilterPanel);
  
  // --- View Toggle State (Events or Spots) ---
  const [viewMode, setViewMode] = useState<"events" | "spots">("events");
  
  // Check if filters are active
  const hasActiveFilters = 
    mapFilters.spotCategories.length > 0 || 
    mapFilters.eventCategories.length > 0 ||
    mapFilters.timeFilter.type !== "all";
  
  // --- Search State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [spotSearchResults, setSpotSearchResults] = useState<Spot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- Remove Category Filter State (no longer needed) ---

  // --- Effect: Handle Search ---
  useEffect(() => {
    // If search is empty, clear results
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSpotSearchResults([]);
      return;
    }

    // Debounce the API call (wait 500ms after typing stops)
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        // Search both events and spots simultaneously
        const [eventResults, spotResults] = await Promise.all([
          EventsApi.searchEvents(searchTerm),
          SpotsApi.searchSpots(searchTerm)
        ]);
        setSearchResults(eventResults);
        setSpotSearchResults(spotResults);
      } catch (err: any) {
        setSearchError("Failed to search events and spots");
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const onSelectEvent = (event: Event) => {
    dispatch(setSelectedEvent(event));
  };

  const onSelectSpot = (spot: Spot) => {
    dispatch(setSelectedSpot(spot));
  };

  const handleOpenFilters = () => {
    dispatch(setShowFilterPanel(!showFilterPanel));
  };

  const handleFilterButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling to document
    handleOpenFilters();
  };

  // Filter out pending events (except for user profile and admin dashboard)
  const nonPendingEvents = nearbyEvents?.filter((event: Event) => event.status !== 'pending');

  // Apply category filters to events
  const categoryFilteredEvents = nonPendingEvents?.filter((event: Event) => {
    if (mapFilters.eventCategories.length === 0) return true;
    return mapFilters.eventCategories.includes(event.category || "default");
  }) || [];

  // Apply time filter to events
  const filteredEvents = filterEventsByTime(categoryFilteredEvents, mapFilters.timeFilter);

  // Sort events by start time (soonest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  // Apply category filters to spots
  const filteredSpots = spots?.filter((spot: Spot) => {
    if (mapFilters.spotCategories.length === 0) return true;
    return mapFilters.spotCategories.includes(spot.category || "default");
  }) || [];

  // Determine what to display: Search Results OR Filtered Events/Spots
  const isSearchMode = searchTerm.trim().length > 0;
  const displayEvents = isSearchMode ? searchResults : sortedEvents;
  const displaySpots = isSearchMode ? spotSearchResults : filteredSpots;
  const displayItems = viewMode === "events" ? displayEvents : displaySpots;
  const isLoading = isSearchMode ? isSearching : isNearbyLoading;
  const error = isSearchMode ? (searchError ? { message: searchError } : null) : nearbyError;
  const listTitle = isSearchMode 
    ? "Search Results" 
    : viewMode === "events" 
      ? "Nearby Events" 
      : "Nearby Spots";
  
  // Calculate total results when searching
  const totalSearchResults = isSearchMode ? (searchResults.length + spotSearchResults.length) : displayItems.length;
  
  // Check if we have any results in search mode
  const hasAnySearchResults = isSearchMode && (searchResults.length > 0 || spotSearchResults.length > 0);

  return (
    <div className="w-96 bg-white shadow-lg flex flex-col z-10 h-full">
      {/* Search Header */}
      <div className="p-4 border-b">
        <div className="relative flex items-center">
          <SearchIcon size={18} className="absolute left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search events or spots..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* View Toggle & Filter Button */}
      {!isSearchMode && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between gap-3">
            {/* Toggle between Events and Spots */}
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setViewMode("events")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  viewMode === "events"
                    ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Calendar size={16} />
                Events
              </button>
              <button
                onClick={() => setViewMode("spots")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  viewMode === "spots"
                    ? "bg-white text-blue-600 border-2 border-blue-500 shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <CircleDot size={16} />
                Spots
              </button>
            </div>
            
            {/* Open Filter Panel Button */}
            <button
              onClick={handleFilterButtonClick}
              data-filter-toggle
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                hasActiveFilters
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Filter size={16} />
              Filters
            </button>
          </div>
        </div>
      )}

      {/* Event/Spot List */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {listTitle}
            </h2>
            <span className="text-sm text-gray-500">
              {isSearchMode ? `${totalSearchResults} found` : `${displayItems.length} found`}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-red-600 mb-1">
                  Error loading {isSearchMode ? "results" : viewMode}
                </p>
                <p className="text-xs text-gray-500">{error.message}</p>
              </div>
            </div>
          ) : isSearchMode ? (
            // Search mode: show events and spots in sections
            !hasAnySearchResults ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    No events or spots found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Events Section */}
                {searchResults.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Calendar size={18} className="text-orange-600" />
                      Events ({searchResults.length})
                    </h3>
                    <div className="space-y-3">
                      {searchResults.map((event: Event) => {
                        const bgColor = categoryColors[event.category] || categoryColors.default;
                        return (
                          <div
                            key={event.id}
                            onClick={() => onSelectEvent(event)}
                            className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white hover:border-orange-300"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center">
                                  <div className="sidebar-event-icon-box">
                                    <Calendar size={20} color='black' strokeWidth={2.5} />
                                  </div>
                                </span>
                                <div>
                                  <h3 className="font-semibold text-gray-800">
                                    {event.name}
                                  </h3>
                                  {event.spot_id && spots && (
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      at: {spots.find(s => s.id === event.spot_id)?.name || 'Unknown Spot'}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {event.description}
                                  </p>
                                </div>
                              </div>
                              <span 
                                className="px-2 py-1 text-xs font-medium rounded bg-white border-2"
                                style={{ borderColor: bgColor, color: bgColor }}
                              >
                                {event.category}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 text-green-600">
                                  Start: {new Date(event.start_time).toLocaleDateString('en-GB')}
                                </span>
                                <span className="flex items-center gap-1 capitalize">
                                  {event.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Spots Section */}
                {spotSearchResults.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <CircleDot size={18} className="text-blue-600" />
                      Spots ({spotSearchResults.length})
                    </h3>
                    <div className="space-y-3">
                      {spotSearchResults.map((spot: Spot) => {
                        const IconComponent = categoryIcons[spot.category as keyof typeof categoryIcons] || categoryIcons.other;
                        const bgColor = categoryColors[spot.category] || categoryColors.default;
                        return (
                          <div
                            key={spot.id}
                            onClick={() => onSelectSpot(spot)}
                            className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white hover:border-blue-300"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center">
                                  <div className="sidebar-event-icon-box" style={{ borderRadius: '50%' }}>
                                    <IconComponent size={20} color='black' strokeWidth={2.5} />
                                  </div>
                                </span>
                                <div>
                                  <h3 className="font-semibold text-gray-800">
                                    {spot.name}
                                  </h3>
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {spot.description}
                                  </p>
                                </div>
                              </div>
                              <span 
                                className="px-2 py-1 text-xs font-medium rounded bg-white border-2"
                                style={{ borderColor: bgColor, color: bgColor }}
                              >
                                {spot.category}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : displayItems.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  No {viewMode} found
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Try changing the map view or filters
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {viewMode === "events" ? (
                displayEvents.map((event: Event) => {
                  const bgColor = categoryColors[event.category] || categoryColors.default;
                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white hover:border-orange-300"
                    >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center">
                          <div className="sidebar-event-icon-box">
                            <Calendar size={20} color='black' strokeWidth={2.5} />
                          </div>
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {event.name}
                          </h3>
                          {event.spot_id && spots && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              at: {spots.find(s => s.id === event.spot_id)?.name || 'Unknown Spot'}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {event.description}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded bg-white border-2"
                        style={{ borderColor: bgColor, color: bgColor }}
                      >
                        {event.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-600">
                          Start: {new Date(event.start_time).toLocaleDateString('en-GB')}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : (
                displaySpots.map((spot: Spot) => {
                  const IconComponent = categoryIcons[spot.category as keyof typeof categoryIcons] || categoryIcons.other;
                  const bgColor = categoryColors[spot.category] || categoryColors.default;
                  return (
                    <div
                      key={spot.id}
                      onClick={() => onSelectSpot(spot)}
                      className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white hover:border-blue-300"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center">
                            <div className="sidebar-event-icon-box" style={{ borderRadius: '50%' }}>
                              <IconComponent size={20} color='black' strokeWidth={2.5} />
                            </div>
                          </span>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {spot.name}
                            </h3>
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {spot.description}
                            </p>
                          </div>
                        </div>
                        <span 
                          className="px-2 py-1 text-xs font-medium rounded bg-white border-2"
                          style={{ borderColor: bgColor, color: bgColor }}
                        >
                          {spot.category}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}