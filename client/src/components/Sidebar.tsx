import React, { useState } from "react";
import { Filter } from "lucide-react";
import { RootState } from "../state/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEvent } from "../state/AppSlice";
import { Event } from "../generated-types";

export default function Sidebar({
  categories,
  events,
  isLoading,
  error,
}: {
  categories: any[];
  events: Event[];
  isLoading?: boolean;
  error?: Error | null;
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const selectedEvent = useSelector(
    (state: RootState) => state.app.selectedEvent
  );
  const dispatch = useDispatch();
  const onSelectEvent = (event: Event) => {
    dispatch(setSelectedEvent(event));
  };
  return (
    <div className="w-96 bg-white shadow-lg flex flex-col z-10">
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Search events or locations..."
            className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

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

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              Nearby Events
            </h2>
            <span className="text-sm text-gray-500">
              {events.length} active
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading events...</p>
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
          ) : events.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-sm text-gray-500">No events found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Events will appear here when available
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event: Event) => (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📅</span>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {event.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded bg-gray-500 text-white`}
                    >
                      {event.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1">
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1">
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
