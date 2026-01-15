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
import CreateSpotModal from "./CreateSpotModal";
import CreateEventModal from "./CreateEventModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type TabType = "spots" | "events" | "reports" | "favorites" | "subscriptions";

const UserProfilePage = () => {
  const { token, user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>("spots");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 30;
  const [totals, setTotals] = useState({
    spots: 0,
    events: 0,
    reports: 0,
    favorites: 0,
    subscriptions: 0
  });
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<Spot[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<Event[]>([]);
  const [pendingEventsAtMySpots, setPendingEventsAtMySpots] = useState<Event[]>([]);

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

  const loadMySpots = async (pageNum = 1) => {
    if (!user) return;
    try {
      const data: any = await authFetch(
        `/api/spots/?owner_id=${user.id}&page=${pageNum}&limit=${LIMIT}`
      );
      setMySpots(data.spots || []);
      setTotals(prev => ({ ...prev, spots: data.total || 0 }));
    } catch (err) {
      console.error("Failed to load spots:", err);
    }
  };

  const loadMyEvents = async (pageNum = 1) => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/events/?owner_id=${user.id}&status=all&page=${pageNum}&limit=${LIMIT}`);
      const events = data.data || [];
      setMyEvents(events);
      setTotals(prev => ({ ...prev, events: data.total || 0 }));
      const spotIds = events
        .filter((event: Event) => event.spot_id)
        .map((event: Event) => event.spot_id as number);

      const uniqueSpotIds = [...new Set(spotIds)] as number[];

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

  const loadMyReports = async (pageNum = 1) => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/reports/?page=${pageNum}&limit=${LIMIT}`);
      const userReports = (data.data || []).filter((r: Report) => r.user_id === user.id);
      setMyReports(userReports);

      const spotIds = userReports
        .filter((report: Report) => report.spot_id)
        .map((report: Report) => report.spot_id as number);
      const eventIds = userReports
        .filter((report: Report) => report.event_id)
        .map((report: Report) => report.event_id as number);

      const uniqueSpotIds = [...new Set(spotIds)] as number[];
      const uniqueEventIds = [...new Set(eventIds)] as number[];

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

  const loadFavoriteSpots = async (pageNum = 1) => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/favorites/spots?page=${pageNum}&limit=${LIMIT}`);
      setFavoriteSpots(data.data || []);
      setTotals(prev => ({ ...prev, favorites: data.total || (data.data?.length || 0) }));
    } catch (err) {
      console.error("Failed to load favorite spots:", err);
    }
  };

  const loadSubscribedEvents = async (pageNum = 1) => {
    if (!user) return;
    try {
      const data: any = await authFetch(`/api/subscriptions/events?page=${pageNum}&limit=${LIMIT}`);
      const events = data.data || [];
      setSubscribedEvents(events);
      setTotals(prev => ({ ...prev, subscriptions: data.total || (data.data?.length || 0) }));
      const spotIds = events
        .filter((event: Event) => event.spot_id)
        .map((event: Event) => event.spot_id as number);

      const uniqueSpotIds = [...new Set(spotIds)] as number[];

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

  const loadPendingEventsAtMySpots = async () => {
    if (!user) return;
    try {
      // Get all pending events first
      const eventsData: any = await authFetch(`/api/events/?status=pending&limit=1000`);
      const allPendingEvents = eventsData.data || [];
      
      if (allPendingEvents.length === 0) {
        setPendingEventsAtMySpots([]);
        return;
      }
      
      // Get unique spot IDs from pending events
      const spotIdsInPendingEvents = [...new Set(
        allPendingEvents
          .filter((e: Event) => e.spot_id)
          .map((e: Event) => e.spot_id)
      )] as number[];
      
      // Instead of fetching all spots, check each spot's ownership directly
      // This avoids pagination issues when you have thousands of spots
      const spotOwnershipChecks = await Promise.all(
        spotIdsInPendingEvents.map(async (spotId) => {
          try {
            const spotData: any = await authFetch(`/api/spots/${spotId}`);
            return {
              spotId,
              isMySpot: spotData.owner_id === user.id
            };
          } catch (err) {
            console.error(`Failed to check ownership of spot ${spotId}:`, err);
            return { spotId, isMySpot: false };
          }
        })
      );
      
      const mySpotIdsFromPending = spotOwnershipChecks
        .filter(check => check.isMySpot)
        .map(check => check.spotId);
      
      // Filter to only show events at spots I own (but not created by me)
      const pendingAtMySpots = allPendingEvents.filter(
        (event: Event) => {
          const isAtMySpot = event.spot_id && mySpotIdsFromPending.includes(event.spot_id);
          const notCreatedByMe = event.owner_id !== user.id;
          return isAtMySpot && notCreatedByMe;
        }
      );
      
      console.log('Filtered pending events at my spots:', pendingAtMySpots.length, pendingAtMySpots);
      setPendingEventsAtMySpots(pendingAtMySpots);

      // Load spot names for these events
      const spotIds = pendingAtMySpots
        .filter((event: Event) => event.spot_id)
        .map((event: Event) => event.spot_id as number);

      const uniqueSpotIds = [...new Set(spotIds)] as number[];

      await Promise.all(
        uniqueSpotIds.map(async (spotId) => {
          if (!spotNames[spotId]) {
            await fetchSpotName(spotId);
          }
        })
      );
    } catch (err) {
      console.error("Failed to load pending events:", err);
    }
  };

  const handleApproveEvent = async (eventId: number) => {
    try {
      await authFetch(`/api/events/${eventId}/approve`, { method: "PUT" });
      // Reload events
      await Promise.all([loadMyEvents(), loadPendingEventsAtMySpots()]);
    } catch (err: any) {
      alert(err.message || "Failed to approve event");
    }
  };

  // Initial Load (Mount): Load page 1 of EVERYTHING to populate tab counts
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setInitialLoading(true);
      await Promise.all([
        loadMySpots(1),
        loadMyEvents(1),
        loadMyReports(1),
        loadFavoriteSpots(1),
        loadSubscribedEvents(1)
      ]);
      setInitialLoading(false);
    };
    init();
  }, [user]);

  // Tab or Page Change: Load specific data
  useEffect(() => {
    if (!user || initialLoading) return; // Skip if still initializing

    if (activeTab === "spots") loadMySpots(page);
    if (activeTab === "events") {
      loadMyEvents(page);
      loadPendingEventsAtMySpots(); // Load pending events when viewing events tab
    }
    if (activeTab === "reports") loadMyReports(page);
    if (activeTab === "favorites") loadFavoriteSpots(page);
    if (activeTab === "subscriptions") loadSubscribedEvents(page);
    
    // Reset search on tab change
    setSearchTerm("");
  }, [activeTab, page]);

  // Remove the old useEffect that depended on mySpots.length

  // Clear search when switching tabs
  useEffect(() => {
    setSearchTerm("");
    setPage(1);
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

  const Pagination = () => {
    // Determine which total to use based on active tab
    let currentTotal = 0;
    if (activeTab === "spots") currentTotal = totals.spots;
    if (activeTab === "events") currentTotal = totals.events;
    if (activeTab === "reports") currentTotal = totals.reports;
    if (activeTab === "favorites") currentTotal = totals.favorites;
    if (activeTab === "subscriptions") currentTotal = totals.subscriptions;

    const totalPages = Math.ceil(currentTotal / LIMIT);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-4 py-6 mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-white bg-white shadow-sm disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-white bg-white shadow-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

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
        <TabButton id="spots" label="My Spots" icon={MapPin} count={totals.spots} />
        <TabButton id="events" label="My Events" icon={Calendar} count={totals.events} />
        <TabButton id="reports" label="My Reports" icon={Flag} count={totals.reports} />
        <TabButton id="favorites" label="Saved Spots" icon={MapPin} count={totals.favorites} />
        <TabButton id="subscriptions" label="Joined Events" icon={Calendar} count={totals.subscriptions} />
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
                        onClick={() => setEditingSpot(spot)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Spot"
                      >
                        <Edit2 size={18} />
                      </button>
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
            <Pagination />
          </div>
        )}

        {activeTab === "events" && (
          <div className="space-y-6">
            {/* Pending Events Awaiting My Approval */}
            {pendingEventsAtMySpots.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Events Awaiting Your Approval ({pendingEventsAtMySpots.length})
                </h3>
                <div className="space-y-3">
                  {pendingEventsAtMySpots.map(event => (
                    <div key={event.id} className="bg-white p-4 rounded-lg shadow-sm border border-orange-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-md font-semibold text-gray-800">{event.name}</h4>
                            <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                              <Clock size={14} />
                              Needs Approval
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                            <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                              {event.category}
                            </span>
                            {event.spot_id && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                At: {spotNames[event.spot_id] || `Spot #${event.spot_id}`}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            <div><span className="text-gray-500">Start:</span> {new Date(event.start_time).toLocaleDateString('en-GB')}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveEvent(event.id)}
                          className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination />
              </div>
            )}

            {/* My Events */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">My Events</h3>
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
                          {new Date(event.start_time).toLocaleDateString('en-GB')}
                        </div>
                        <div>
                          <span className="text-gray-500">End:</span>{" "}
                          {new Date(event.end_time).toLocaleDateString('en-GB')}
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
                        onClick={() => setEditingEvent(event)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Event"
                      >
                        <Edit2 size={18} />
                      </button>
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
            <Pagination />
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
            <Pagination />
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
            <Pagination />
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
                          {new Date(event.start_time).toLocaleDateString('en-GB')}
                        </div>
                        <div>
                          <span className="text-gray-500">End:</span>{" "}
                          {new Date(event.end_time).toLocaleDateString('en-GB')}
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
      {editingSpot && (
        <CreateSpotModal
          initialData={editingSpot}
          isOpen={true}
          onCloseOverride={() => setEditingSpot(null)}
        />
      )}

      {editingEvent && (
        <CreateEventModal
          initialData={editingEvent}
          isOpen={true}
          onCloseOverride={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
};

export default UserProfilePage;