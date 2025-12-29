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
  X
} from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { Event, Spot, Report } from "../generated-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

type TabType = "spots" | "events" | "reports" | "favorites" | "subscriptions";

const UserProfilePage = () => {
  const { token, user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>("spots");
  const [loading, setLoading] = useState(false);

  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [favoriteSpots, setFavoriteSpots] = useState<Spot[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<Event[]>([]);

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

  const loadMySpots = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: any = await authFetch(`/api/spots/?owner_id=${user.id}`);
      const sortedSpots = (data.spots || []).sort((a: Spot, b: Spot) => {
        // Non-approved spots (false) come before approved spots (true)
        if (a.is_approved === b.is_approved) return 0;
        return a.is_approved ? 1 : -1;
      });
      setMySpots(sortedSpots);
    } catch (err) {
      console.error("Failed to load spots:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: any = await authFetch(`/api/events/?owner_id=${user.id}&status=all`);
      setMyEvents(data.data || []);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyReports = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: any = await authFetch(`/api/reports/`);
      const userReports = (data.data || []).filter((r: Report) => r.user_id === user.id);
      setMyReports(userReports);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteSpots = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: any = await authFetch(`/api/favorites/spots`);
      setFavoriteSpots(data.data || []);
    } catch (err) {
      console.error("Failed to load favorite spots:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribedEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data: any = await authFetch(`/api/subscriptions/events`);
      setSubscribedEvents(data.data || []);
    } catch (err) {
      console.error("Failed to load subscribed events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "spots") loadMySpots();
    if (activeTab === "events") loadMyEvents();
    if (activeTab === "reports") loadMyReports();
    if (activeTab === "favorites") loadFavoriteSpots();
    if (activeTab === "subscriptions") loadSubscribedEvents();
  }, [activeTab, user]);

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
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
        )}

        {activeTab === "spots" && !loading && (
          <div className="space-y-4">
            {mySpots.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">You haven't created any spots yet</p>
              </div>
            ) : (
              mySpots.map(spot => (
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

        {activeTab === "events" && !loading && (
          <div className="space-y-4">
            {myEvents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">You haven't created any events yet</p>
              </div>
            ) : (
              myEvents.map(event => (
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
                            At Spot #{event.spot_id}
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

        {activeTab === "reports" && !loading && (
          <div className="space-y-4">
            {myReports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Flag size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">You haven't submitted any reports yet</p>
              </div>
            ) : (
              myReports.map(report => (
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
                            On Spot #{report.spot_id}
                          </span>
                        ) : report.event_id ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            On Event #{report.event_id}
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

        {activeTab === "favorites" && !loading && (
          <div className="space-y-4">
            {favoriteSpots.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">You haven't saved any spots yet</p>
              </div>
            ) : (
              favoriteSpots.map(spot => (
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

        {activeTab === "subscriptions" && !loading && (
          <div className="space-y-4">
            {subscribedEvents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">You haven't joined any events yet</p>
              </div>
            ) : (
              subscribedEvents.map(event => (
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
                            At Spot #{event.spot_id}
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