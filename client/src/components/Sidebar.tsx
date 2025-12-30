import React, { useState, useEffect } from "react";
import { Filter, Search as SearchIcon, X } from "lucide-react";
import { RootState } from "../state/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEvent } from "../state/AppSlice";
import { Event } from "../generated-types";
import * as EventsApi from "../api/eventsApi"; // Import the new API file

export default function Sidebar({
  categories,
  events: nearbyEvents, // Rename prop to differentiate from search results
  isLoading: isNearbyLoading,
  error: nearbyError,
}: {
  categories: any[];
  events: Event[];
  isLoading?: boolean;
  error?: Error | null;
}) {
  const dispatch = useDispatch();
  
  // --- Search State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- Category Filter State (Visual only for now) ---
  const [activeFilter, setActiveFilter] = useState("all");

  // --- Effect: Handle Search ---
  useEffect(() => {
    // If search is empty, clear results
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce the API call (wait 500ms after typing stops)
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await EventsApi.searchEvents(searchTerm);
        setSearchResults(results);
      } catch (err: any) {
        setSearchError("Failed to search events");
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

  // Determine what to display: Search Results OR Nearby Events (Default)
  const isSearchMode = searchTerm.trim().length > 0;
  const displayEvents = isSearchMode ? searchResults : nearbyEvents;
  const isLoading = isSearchMode ? isSearching : isNearbyLoading;
  const error = isSearchMode ? (searchError ? { message: searchError } : null) : nearbyError;
  const listTitle = isSearchMode ? "Search Results" : "Nearby Events";

  return (
    <div className="w-96 bg-white shadow-lg flex flex-col z-10 h-full">
      {/* Search Header */}
      <div className="p-4 border-b">
        <div className="relative flex items-center">
          <SearchIcon size={18} className="absolute left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search events or locations..."
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

      {/* Categories (Only show if not searching to reduce clutter, or keep if desired) */}
      {!isSearchMode && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setActiveFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeFilter === cat.id
                    ? `${cat.color} text-white`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {listTitle}
            </h2>
            <span className="text-sm text-gray-500">
              {displayEvents.length} found
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
                  Error loading events
                </p>
                <p className="text-xs text-gray-500">{error.message}</p>
              </div>
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-gray-500">No events found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try adjusting your search terms
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {displayEvents.map((event: Event) => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded bg-gray-600 text-white"
                    >
                      {event.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-green-600">
                         Start: {new Date(event.start_time).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}