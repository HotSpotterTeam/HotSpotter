import React, { useEffect, useState } from "react";
import { 
  Users, MapPin, Calendar, Flag, Trash2, CheckCircle, 
  Shield, ShieldAlert, BarChart3, Search
} from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { StatData, User, Spot, Event, Report } from "../generated-types";

// Import the API functions
import * as AdminApi from "../api/adminApi";

const AdminDashboard = () => {
  const { token } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "spots" | "events" | "reports">("overview");
  // --- PAGINATION STATE ---
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 30;
  // Data States
  const [stats, setStats] = useState<StatData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [spotFilter, setSpotFilter] = useState<"all" | "approved" | "pending">("all");
  const [eventFilter, setEventFilter] = useState<"all" | "active" | "pending">("all");

  const categoryEmojis: { [key: string]: string } = {
    party: "🎉",
    restaurant: "🍔",
    sports: "⚽",
    sports_centre: "🏋️",
    music: "🎵",
    art: "🎨",
    tech: "💻",
    nature: "🌳",
    cafe: "☕",
    community_centre: "🏛️",
    beach: "🏖️",
    theatre: "🎭",
    museum: "🏛️",
    art_gallery: "🖼️",
    cinema: "🎬",
    stadium: "🏟️",
    attraction: "🎡",
    shopping: "🛍️",
    social: "🗣️",
    gathering: "🤝",
    gallery: "🖼️",
    bar: "🍸",
    conference_centre: "🏢",
    arts_centre: "🎨",
    house: "🏠",
    other: "📂",
    default: "📂" // Fallback for unknown categories
  };

  // --- Load Data Helpers ---
  const loadStats = () => AdminApi.getStats(token).then(setStats).catch(console.error);
  
 const loadUsers = () => {
    setLoading(true);
    // Pass page and LIMIT to the API
    AdminApi.getUsers(token, searchTerm, onlyAdmins, page, LIMIT)
      .then((res: any) => {
        // Handle response format (support both array and {data, total} object)
        if (res.data && Array.isArray(res.data)) {
          setUsers(res.data);
          setTotalCount(res.total || 0);
        } else if (Array.isArray(res)) {
           // Fallback for old backend
          setUsers(res);
          setTotalCount(res.length);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadSpots = () => {
    setLoading(true);
    AdminApi.getSpots(token, searchTerm, spotFilter, page, LIMIT)
      .then((res: any) => {
        setSpots(res.data);
        setTotalCount(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadEvents = () => {
    setLoading(true);
    AdminApi.getEvents(token, searchTerm, eventFilter, page, LIMIT)
      .then((res: any) => {
        setEvents(res.data);
        setTotalCount(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadReports = () => {
    setLoading(true);
    AdminApi.getReports(token, page, LIMIT)
      .then((res: any) => {
        setReports(res.data);
        setTotalCount(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // --- Effects ---
  
  // 1. Tab Switching
  useEffect(() => {
    setPage(1); // reset page when switching tabs
    setSearchTerm(""); // Clear search on tab switch
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === "overview") loadStats();
    if (activeTab === "users") loadUsers();
    if (activeTab === "spots") loadSpots();
    if (activeTab === "events") loadEvents();
    if (activeTab === "reports") loadReports();
  }, [activeTab, token, page]);

  // 2. Filter Changes
  useEffect(() => { if (activeTab === "users") loadUsers(); }, [searchTerm, onlyAdmins]);
  useEffect(() => { if (activeTab === "spots") loadSpots(); }, [searchTerm, spotFilter]);
  useEffect(() => { if (activeTab === "events") loadEvents(); }, [searchTerm, eventFilter]);


  // --- Action Handlers ---

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Are you sure? This will delete the user and ALL their content.")) return;
    try {
      await AdminApi.deleteUser(token, id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) { alert(err.message); }
  };

  const handleToggleRole = async (user: User) => {
    const action = user.is_admin ? "Remove Admin" : "Make Admin";
    if (!window.confirm(`Are you sure you want to ${action} rights for ${user.email}?`)) return;
    try {
      await AdminApi.toggleUserRole(token, user.id);
      setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u));
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteSpot = async (id: number) => {
    if (!window.confirm("Delete this spot permanently?")) return;
    try {
      await AdminApi.deleteSpot(token, id);
      setSpots(spots.filter(s => s.id !== id));
    } catch (err: any) { alert("Failed to delete spot"); }
  };

  const handleApproveSpot = async (id: number) => {
    try {
      await AdminApi.approveSpot(token, id);
      setSpots(spots.map(s => s.id === id ? { ...s, is_approved: true } : s));
    } catch (err: any) { alert("Failed to approve spot"); }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm("Delete this event permanently?")) return;
    try {
      await AdminApi.deleteEvent(token, id);
      setEvents(events.filter(e => e.id !== id));
    } catch (err: any) { alert("Failed to delete event"); }
  };

  const handleDismissReport = async (id: number) => {
     try {
       await AdminApi.dismissReport(token, id);
       setReports(reports.filter(r => r.id !== id));
     } catch (err: any) { alert("Failed to dismiss report"); }
  };

  // --- Render Helpers ---
  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
        activeTab === id 
        ? "border-blue-600 text-blue-600" 
        : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const Pagination = () => {
    const totalPages = Math.ceil(totalCount / LIMIT);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-4 p-4 border-t bg-white">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-8 py-4">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">System Management & Moderation</p>
      </div>

      {/* Tabs */}
      <div className="bg-white px-8 flex gap-4 overflow-x-auto">
        <TabButton id="overview" label="Overview" icon={BarChart3} />
        <TabButton id="users" label="Users" icon={Users} />
        <TabButton id="spots" label="Spots" icon={MapPin} />
        <TabButton id="events" label="Events" icon={Calendar} />
        <TabButton id="reports" label="Reports" icon={Flag} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {loading && <p>Loading data...</p>}
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && stats && (
          <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <h3 className="text-3xl font-bold">{stats.users.total}</h3>
                </div>
                <Users className="text-blue-500 bg-blue-50 p-2 rounded-lg" size={40} />
              </div>
              <p className="text-sm text-gray-400 mt-2">{stats.users.admins} Admins</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Pending Spots</p>
                  <h3 className="text-3xl font-bold">{stats.spots.pending}</h3>
                </div>
                <MapPin className="text-orange-500 bg-orange-50 p-2 rounded-lg" size={40} />
              </div>
              <p className="text-sm text-gray-400 mt-2">{stats.spots.total} Total Spots</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Active Events</p>
                  <h3 className="text-3xl font-bold">{stats.events.active}</h3>
                </div>
                <Calendar className="text-green-500 bg-green-50 p-2 rounded-lg" size={40} />
              </div>
              <p className="text-sm text-gray-400 mt-2">{stats.events.total} Total Events</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-sm">Flagged Reports</p>
                  <h3 className="text-3xl font-bold text-red-600">{stats.reports.flagged}</h3>
                </div>
                <Flag className="text-red-500 bg-red-50 p-2 rounded-lg" size={40} />
              </div>
              <p className="text-sm text-gray-400 mt-2">{stats.reports.total} Total Reports</p>
            </div>
          </div>  
            
            <div className="flex flex-col lg:flex-row justify-center items-start gap-12 mt-12 w-full">
              {/* --- SPOT CATEGORIES COLUMN --- */}
              <div className="w-full max-w-md space-y-4">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-center gap-2 text-lg">
                  <MapPin size={24} className="text-orange-500" /> Spot Categories
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.spots.by_category || {}).map(([category, count]: [string, any]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" role="img" aria-label={category}>
                          {categoryEmojis[category.toLowerCase()] || categoryEmojis.default}
                        </span>
                        <span className="text-gray-700 capitalize font-medium text-lg">
                          {category}
                        </span>
                      </div>
                      <span className="font-bold text-sm text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- EVENT CATEGORIES COLUMN --- */}
              <div className="w-full max-w-md space-y-4">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-center gap-2 text-lg">
                  <Calendar size={24} className="text-green-500" /> Event Categories
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.events.by_category || {}).map(([category, count]: [string, any]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" role="img" aria-label={category}>
                          {categoryEmojis[category.toLowerCase()] || categoryEmojis.default}
                        </span>
                        <span className="text-gray-700 capitalize font-medium text-lg">
                          {category}
                        </span>
                      </div>
                      <span className="font-bold text-sm text-gray-800 bg-gray-100 px-3 py-1 rounded-full">
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            
          </div>
          </div>
        )}

        {/* TAB 2: USERS */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b flex gap-2">
              <Search className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users by id, name or email..." 
                className="outline-none flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer transition-colors select-none bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                <input 
                  type="checkbox" 
                  checked={onlyAdmins}
                  onChange={(e) => setOnlyAdmins(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                Admins Only
            </label>
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500">#{u.id}</td>
                    <td className="p-4">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_admin ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleToggleRole(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Toggle Admin">
                        {u.is_admin ? <ShieldAlert size={18} /> : <Shield size={18} />}
                      </button>
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete User">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination />
          </div>
        )}

        {/* TAB 3: SPOTS */}
        {activeTab === "spots" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
             {/* Spots Search Toolbar */}
             <div className="p-4 border-b flex gap-2 bg-gray-50">
                <div className="flex gap-2 items-center bg-white border border-gray-200 px-3 py-2 rounded-md w-full max-w-md">
                  <Search className="text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search spots by name or category..." 
                    className="bg-transparent outline-none flex-1 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                    value={spotFilter}
                    onChange={(e) => setSpotFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                    <option value="all">All Spots</option>
                    <option value="approved">Approved Only</option>
                    <option value="pending">Pending Approval</option>
                </select>
             </div>

             <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Owner ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {spots?.map(spot => (
                  <tr key={spot.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500 text-xs">#{spot.id}</td>
                    <td className="p-4 font-medium">{spot.name}</td>
                    <td className="p-4 text-sm text-gray-500 capitalize">{spot.category}</td>
                    <td className="p-4 text-sm text-gray-500">User #{spot.owner_id}</td>
                    <td className="p-4">
                       {spot.is_approved 
                        ? <span className="text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">Active</span>
                        : <span className="text-orange-600 text-xs font-bold border border-orange-200 bg-orange-50 px-2 py-1 rounded">Pending</span>
                       }
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {!spot.is_approved && (
                        <button onClick={() => handleApproveSpot(spot.id)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Approve">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteSpot(spot.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination />
          </div>
        )}

        {/* TAB 4: EVENTS */}
        {activeTab === "events" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
             {/* Events Search Toolbar */}
             <div className="p-4 border-b flex gap-2 bg-gray-50">
                <div className="flex gap-2 items-center bg-white border border-gray-200 px-3 py-2 rounded-md w-full max-w-md">
                  <Search className="text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search events by name..." 
                    className="bg-transparent outline-none flex-1 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                    <option value="all">All Events</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                </select>
             </div>

             <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Event Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Timeline</th> 
                  <th className="p-4">Linked To</th> 
                  <th className="p-4">Owner ID</th>  
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events?.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500 text-xs">#{event.id}</td>
                    <td className="p-4">
                      <div className="font-medium">{event.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{event.status}</div>
                    </td>
                    <td className="p-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize border border-gray-200">
                            {event.category}
                        </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      <div className="flex flex-col text-xs">
                         <span className="text-green-600">Start: {new Date(event.start_time).toLocaleString()}</span>
                         <span className="text-red-500">End: {new Date(event.end_time).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                        {event.spot_id ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs border border-blue-100">
                                Spot #{event.spot_id}
                            </span>
                        ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-500">User #{event.owner_id}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination />
          </div>
        )}

        {/* TAB 5: REPORTS */}
        {activeTab === "reports" && (
           <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {reports.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No flagged reports! Good job.</div>
            ) : (
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Report Description</th>
                  <th className="p-4">Linked To</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports?.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-500">#{report.id}</td>
                    <td className="p-4 text-red-600 font-medium">{report.description}</td>
                    <td className="p-4 text-sm text-gray-500">
                        {report.spot_id ? `Spot #${report.spot_id}` : `Event #${report.event_id}`}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleDismissReport(report.id)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
                        Dismiss
                      </button>
                      {/* Note: To delete the content, we'd need to cross-reference the spot/event ID manually or add a dedicated API button */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
            <Pagination />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;