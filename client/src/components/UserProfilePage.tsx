import React, { useEffect, useState } from "react";
import {
  User as UserIcon,
  MapPin,
  Calendar,
  Flag,
  Trash2,
  Edit2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Search
} from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { Event, Spot, Report } from "../generated-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type TabType = "spots" | "events" | "reports" | "favorites" | "subscriptions";

const UserProfilePage = () => {
  const { token, user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>("spots");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<Spot[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<Event[]>([]);

  const [spotNames, setSpotNames] = useState<Record<number, string>>({});
  const [eventNames, setEventNames] = useState<Record<number, string>>({});

  const authFetch = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${res.statusText}`);
    }
    return res.json();
  };

  const fetchSpotName = async (spotId: number) => {
    if (spotNames[spotId]) return;

    console.log(`Fetching spot name for ID: ${spotId}`);
    console.log(`API URL: ${API_URL}/api/spots/${spotId}`);
    console.log(`Token exists: ${!!token}`);

    try {
      const data: any = await authFetch(`/api/spots/${spotId}`);
      console.log(`Spot ${spotId} full response:`, data);
      console.log(`Response type:`, typeof data);
      console.log(`Response has name?:`, 'name' in data);
      console.log(`Response.data exists?:`, 'data' in data);

      // Check both possible response formats
      let spotName = null;

      // Format 1: Direct spot object (what response_model=SpotResponse should return)
      if (data && data.name) {
        spotName = data.name;
        console.log(`Found name in direct format: ${spotName}`);
      }
      // Format 2: Wrapped in {status, data} (in case backend changed)
      else if (data && data.data && data.data.name) {
        spotName = data.data.name;
        console.log(`Found name in wrapped format: ${spotName}`);
      }

      if (spotName) {
        setSpotNames(prev => ({ ...prev, [spotId]: spotName }));
        console.log(`Successfully set spot name: ${spotName}`);
      } else {
        console.error(`Could not find name in response for spot ${spotId}`);
        setSpotNames(prev => ({ ...prev, [spotId]: `Spot #${spotId}` }));
      }
    } catch (err) {
      console.error(`Error fetching spot ${spotId}:`, err);
      // Set a fallback so it doesn't keep loading
      setSpotNames(prev => ({ ...prev, [spotId]: `Spot #${spotId}` }));
    }
  };

  const fetchEventName = async (eventId: number) => {
    if (eventNames[eventId]) return;
    try {
      const data: any = await authFetch(`/api/events/${eventId}`);
      console.log(`Event ${eventId} response:`, data);

      // Events endpoint returns EventResponse with {status, data} wrapper
      if (data && data.data && data.data.name) {
        setEventNames(prev => ({ ...prev, [eventId]: data.data.name }));
      }
    } catch (err) {
      console.error(`Failed to load event name for ${eventId}:`, err);
      // Set a fallback so it doesn't keep loading
      setEventNames(prev => ({ ...prev, [eventId]: `Event #${eventId}` }));
    }
  };

  const loadMySpots = async () => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/spots/?owner_id=${user.id}`);
      const sortedSpots = (data.spots || []).sort((a: Spot, b: Spot) => {
        if (a.is_approved === b.is_approved) return 0;
        return a.is_approved ? 1 : -1;
      });
      setMySpots(sortedSpots);
    } catch (err) {
      console.error("Failed to load spots:", err);
    }
  };

  const loadMyEvents = async () => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/events/?owner_id=${user.id}&status=all`);
      const events = data.data || [];
      setMyEvents(events);

      const spotIds = events
        .filter((event: Event) => event.spot_id)
        .map((event: Event) => event.spot_id as number);

      const uniqueSpotIds = [...new Set(spotIds)];

      await Promise.all(
        uniqueSpotIds.map(async (spotId) => {
          if (!spotNames[spotId]) {
            await fetchSpotName(spotId);
          }
        })
      );
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  const loadMyReports = async () => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/reports/`);
      const userReports = (data.data || []).filter((r: Report) => r.user_id === user.id);
      setMyReports(userReports);

      const spotIds = userReports
        .filter((report: Report) => report.spot_id)
        .map((report: Report) => report.spot_id as number);
      const eventIds = userReports
        .filter((report: Report) => report.event_id)
        .map((report: Report) => report.event_id as number);

      const uniqueSpotIds = [...new Set(spotIds)];
      const uniqueEventIds = [...new Set(eventIds)];

      await Promise.all([
        ...uniqueSpotIds.map(async (spotId) => {
          if (!spotNames[spotId]) {
            await fetchSpotName(spotId);
          }
        }),
        ...uniqueEventIds.map(async (eventId) => {
          if (!eventNames[eventId]) {
            await fetchEventName(eventId);
          }
        })
      ]);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const loadFavoriteSpots = async () => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/favorites/spots`);
      setFavoriteSpots(data.data || []);
    } catch (err) {
      console.error("Failed to load favorite spots:", err);
    }
  };

  const loadSubscribedEvents = async () => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/subscriptions/events`);
      const events = data.data || [];
      setSubscribedEvents(events);

      const spotIds = events
        .filter((event: Event) => event.spot_id)
        .map((event: Event) => event.spot_id as number);

      const uniqueSpotIds = [...new Set(spotIds)];

      await Promise.all(
        uniqueSpotIds.map(async (spotId) => {
          if (!spotNames[spotId]) {
            await fetchSpotName(spotId);
          }
        })
      );
    } catch (err) {
      console.error("Failed to load subscribed events:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Load all data when component mounts
    const loadAllData = async () => {
      setInitialLoading(true);
      await Promise.all([
        loadMySpots(),
        loadMyEvents(),
        loadMyReports(),
        loadFavoriteSpots(),
        loadSubscribedEvents()
      ]);
      setInitialLoading(false);
    };

    loadAllData();
  }, [user]);

  // Clear search when switching tabs
  useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const filterItems = <T extends Spot | Event | Report>(items: T[]): T[] => {
    if (!searchTerm.trim()) return items;

    const term = searchTerm.toLowerCase();
    return items.filter((item) => {
      if ('name' in item && item.name?.toLowerCase().includes(term)) return true;
      if ('description' in item && item.description?.toLowerCase().includes(term)) return true;
      if ('category' in item && item.category?.toLowerCase().includes(term)) return true;
      return false;
    });
  };

  const handleDeleteSpot = async (id: number) => {
    if (!window.confirm("Delete this spot permanently?")) return;
    try {
      await authFetch(`/api/spots/${id}`, { method: "DELETE" });
      setMySpots(mySpots.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete spot");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
      await authFetch(`/api/events/${id}`, { method: "DELETE" });
      setMyEvents(myEvents.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete event");
    }
  };

  const handleDeleteReport = async (id: number) => {
    if (!window.confirm("Delete this report permanently?")) return;
    try {
      await authFetch(`/api/reports/${id}`, { method: "DELETE" });
      setMyReports(myReports.filter(r => r.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete report");
    }
  };

  const handleUnfavoriteSpot = async (id: number) => {
    try {
      await authFetch(`/api/spots/${id}/favorite`, { method: "DELETE" });
      setFavoriteSpots(favoriteSpots.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to remove favorite");
    }
  };

  const handleUnsubscribeEvent = async (id: number) => {
    try {
      await authFetch(`/api/events/${id}/subscribe`, { method: "DELETE" });
      setSubscribedEvents(subscribedEvents.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to unsubscribe");
    }
  };

  const TabButton = ({ id, label, icon: Icon, count }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
        activeTab === id
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon size={18} />
      {label}
      {count !== undefined && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          activeTab === id
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-600"
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Please log in to view your profile</p>
      </div>
    );
  }

  const filteredSpots = filterItems(mySpots);
  const filteredEvents = filterItems(myEvents);
  const filteredReports = filterItems(myReports);
  const filteredFavorites = filterItems(favoriteSpots);
  const filteredSubscriptions = filterItems(subscribedEvents);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-start gap-4">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="w-20 h-20 rounded-full border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon size={32} className="text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">{user.name || "User"}</h1>
              <p className="text-gray-500">{user.email}</p>
              {user.is_admin && (
                <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-8 flex gap-4 overflow-x-auto border-b max-w-6xl mx-auto w-full">
        <TabButton id="spots" label="My Spots" icon={MapPin} count={mySpots.length} />
        <TabButton id="events" label="My Events" icon={Calendar} count={myEvents.length} />
        <TabButton id="reports" label="My Reports" icon={Flag} count={myReports.length} />
        <TabButton id="favorites" label="Saved Spots" icon={MapPin} count={favoriteSpots.length} />
        <TabButton id="subscriptions" label="Joined Events" icon={Calendar} count={subscribedEvents.length} />
      </div>

      <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {initialLoading && (
          <div className="fixed inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Loading your profile...</p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {activeTab === "spots" && (
          <div className="space-y-4">
            {filteredSpots.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? "No spots match your search" : "You haven't created any spots yet"}
                </p>
              </div>
            ) : (
              filteredSpots.map(spot => (
                <div key={spot.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{spot.name}</h3>
                        {spot.is_approved ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            <CheckCircle size={14} />
                            Approved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                            <Clock size={14} />
                            Pending Approval
                          </span>
                        )}
                      </div>
                      {spot.description && (
                        <p className="text-sm text-gray-600 mb-3">{spot.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                          {spot.category}
                        </span>
                        <span>ID: #{spot.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteSpot(spot.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Spot"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? "No events match your search" : "You haven't created any events yet"}
                </p>
              </div>
            ) : (
              filteredEvents.map(event => (
                <div key={event.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{event.name}</h3>
                        {event.status === "active" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            <CheckCircle size={14} />
                            Active
                          </span>
                        ) : event.status === "pending" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                            <Clock size={14} />
                            Pending Approval
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                            {event.status}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                        <div>
                          <span className="text-gray-500">Start:</span>{" "}
                          {new Date(event.start_time).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-gray-500">End:</span>{" "}
                          {new Date(event.end_time).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                          {event.category}
                        </span>
                        {event.spot_id && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {spotNames[event.spot_id] ? (
                              `At Spot: ${spotNames[event.spot_id]}`
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
                                Loading spot...
                              </span>
                            )}
                          </span>
                        )}
                        <span>ID: #{event.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Flag size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? "No reports match your search" : "You haven't submitted any reports yet"}
                </p>
              </div>
            ) : (
              filteredReports.map(report => (
                <div key={report.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-800">
                          Report #{report.id}
                        </h3>
                        {report.is_flagged && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                            <AlertCircle size={14} />
                            Flagged
                          </span>
                        )}
                        <span className="text-xs text-gray-500 capitalize">
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{report.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {report.spot_id ? (
                          <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded">
                            {spotNames[report.spot_id] ? (
                              `On Spot: ${spotNames[report.spot_id]}`
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 border-2 border-orange-700 border-t-transparent rounded-full animate-spin"></span>
                                Loading spot...
                              </span>
                            )}
                          </span>
                        ) : report.event_id ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {eventNames[report.event_id] ? (
                              `On Event: ${eventNames[report.event_id]}`
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
                                Loading event...
                              </span>
                            )}
                          </span>
                        ) : null}
                        <span>
                          {new Date(report.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {user.is_admin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="space-y-4">
            {filteredFavorites.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? "No favorite spots match your search" : "You haven't saved any spots yet"}
                </p>
              </div>
            ) : (
              filteredFavorites.map(spot => (
                <div key={spot.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{spot.name}</h3>
                        {spot.is_approved && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            <CheckCircle size={14} />
                            Approved
                          </span>
                        )}
                      </div>
                      {spot.description && (
                        <p className="text-sm text-gray-600 mb-3">{spot.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                          {spot.category}
                        </span>
                        <span>ID: #{spot.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnfavoriteSpot(spot.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove from Favorites"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            {filteredSubscriptions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? "No joined events match your search" : "You haven't joined any events yet"}
                </p>
              </div>
            ) : (
              filteredSubscriptions.map(event => (
                <div key={event.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{event.name}</h3>
                        {event.status === "active" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                            <CheckCircle size={14} />
                            Active
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                        <div>
                          <span className="text-gray-500">Start:</span>{" "}
                          {new Date(event.start_time).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-gray-500">End:</span>{" "}
                          {new Date(event.end_time).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                          {event.category}
                        </span>
                        {event.spot_id && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {spotNames[event.spot_id] ? (
                              `At Spot: ${spotNames[event.spot_id]}`
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
                                Loading spot...
                              </span>
                            )}
                          </span>
                        )}
                        <span>ID: #{event.id}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnsubscribeEvent(event.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Leave Event"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;