import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Camera, Navigation, Flag, Star, ExternalLink, MapPin, Bell } from "lucide-react";
import { RootState } from "../state/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEvent } from "../state/AppSlice";
import { Event, Report } from "../generated-types";
import { getReports, flagReport } from "../api/reportsApi";
import { useAppSelector } from "../store/hooks";
import AddReportModal from "./AddReportModal";
import FlagReportModal from "./FlagReportModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function EventDetail() {
  const selectedEvent = useSelector(
    (state: RootState) => state.app.selectedEvent
  );
  const dispatch = useDispatch();
  const { token } = useAppSelector((state) => state.auth);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);
  const [reportToFlag, setReportToFlag] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [showNavigateMenu, setShowNavigateMenu] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const onClose = () => {
    dispatch(setSelectedEvent(null));
    setShowAddReport(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        detailRef.current &&
        !detailRef.current.contains(target) &&
        !document.querySelector('[data-modal="add-report"]')?.contains(target) &&
        !document.getElementById('flag-modal-content')?.contains(target)
      ) {
        onClose();
      }
    };

    if (selectedEvent) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedEvent]);

  useEffect(() => {
    if (selectedEvent?.id) {
      setLoading(true);
      getReports(selectedEvent.id, undefined, undefined)
        .then(setReports)
        .catch(console.error)
        .finally(() => setLoading(false));

      if (token) {
        checkIfSubscribed();
      }
    }
  }, [selectedEvent?.id, token]);

  const checkIfSubscribed = async () => {
    if (!token || !selectedEvent?.id) return;

    try {
      const response = await fetch(`${API_URL}/api/subscriptions/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        const subscribed = data.data.some((event: any) => event.id === selectedEvent.id);
        setIsSubscribed(subscribed);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleSubscribeToggle = async () => {
    if (!token) {
      alert("You must be logged in to subscribe to an event");
      return;
    }

    setSubscribeLoading(true);
    try {
      const endpoint = `${API_URL}/api/events/${selectedEvent?.id}/subscribe`;
      const method = isSubscribed ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsSubscribed(!isSubscribed);
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Failed to update subscription');
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleFlagReport = (reportId: number) => {
    if (!token) {
      alert("You must be logged in to flag a report");
      return;
    }
    setReportToFlag(reportId);
  };

  const handleFlagSuccess = () => {
    if (selectedEvent?.id) {
      getReports(selectedEvent.id, undefined, undefined)
        .then(setReports)
        .catch(console.error);
    }
    alert("Report flagged for review. Thank you for helping keep our community safe.");
  };

  const handleReportAdded = () => {
    if (selectedEvent?.id) {
      getReports(selectedEvent.id, undefined, undefined)
        .then(setReports)
        .catch(console.error);
    }
  };

  const renderScore = (score?: number) => {
    if (!score) return null;

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < score ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  return selectedEvent ? (
    <>
      <div
        ref={detailRef}
        className="fixed left-[400px] top-20 bottom-8 w-96 bg-white rounded-lg shadow-2xl p-6 z-40 flex flex-col"
      >
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              {selectedEvent?.name}
            </h3>
            <p className="text-sm text-gray-600">{selectedEvent?.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TrendingUp size={16} className="text-green-600" />
            <span className="font-medium capitalize">{selectedEvent?.status}</span>
            {selectedEvent?.start_time && (
              <>
                <span>•</span>
                <span className="text-gray-700 font-medium">
                  {(() => {
                    const startDate = new Date(selectedEvent.start_time);
                    const endDate = new Date(selectedEvent.end_time);
                    const isSameDay = startDate.toDateString() === endDate.toDateString();
                    const startStr = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
                    const endStr = isSameDay 
                      ? endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                      : `${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
                    return `${startStr} – ${endStr}`;
                  })()}
                </span>
              </>
            )}
          </div>

          {selectedEvent?.spot_id && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
               <MapPin size={16} className="text-blue-600" />
               <span className="font-medium">
                 at: {selectedEvent.spot_name || `Spot #${selectedEvent.spot_id}`}
               </span>
            </div>
          )}

          {selectedEvent?.category && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-500 text-white">
                {selectedEvent.category}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-4 flex-shrink-0">
          <button
            onClick={() => setShowAddReport(true)}
            className="flex-1 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!token}
          >
            {token ? "Add Report" : "Login to Add Report"}
          </button>

          <button
            onClick={handleSubscribeToggle}
            disabled={!token || subscribeLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSubscribed
                ? 'bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-md'
            }`}
            title={isSubscribed ? "Unsubscribe from event" : "Subscribe to event"}
          >
            <Bell
              size={18}
              className={isSubscribed ? 'fill-current' : ''}
            />
          </button>

          {selectedEvent.external_link && (
            <a
              href={selectedEvent.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-3 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
              title="Open Event Link"
            >
              <ExternalLink size={18} />
            </a>
          )}
          <div className="relative">
            <button 
              onClick={() => setShowNavigateMenu(!showNavigateMenu)}
              className="flex items-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
            >
              <Navigation size={18} />
              Navigate
            </button>
            {showNavigateMenu && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const [lat, lng] = selectedEvent.location;
                    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
                    setShowNavigateMenu(false);
                  }}
                >
                  Waze
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const [lat, lng] = selectedEvent.location;
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                    setShowNavigateMenu(false);
                  }}
                >
                  Google Maps
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    const [lat, lng] = selectedEvent.location;
                    window.open(`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`, '_blank');
                    setShowNavigateMenu(false);
                  }}
                >
                  Apple Maps
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Recent Reports {!loading && `(${reports.length})`}
          </h4>
          <div className="space-y-2 h-full overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No reports yet</p>
                <p className="text-xs mt-1">Be the first to share your experience!</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-gray-50 rounded p-3 relative">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          {report.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(report.date, report.time)}
                        </span>
                      </div>
                      {renderScore(report.score)}
                    </div>
                    {token && (
                      <div className="relative group">
                        <button
                          onClick={() => handleFlagReport(report.id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          aria-label="Report inappropriate content"
                        >
                          <Flag size={14} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 px-3 py-1.5 bg-white rounded-lg shadow-md text-xs text-gray-700 font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-50 pointer-events-none">
                          Report inappropriate content
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{report.description}</p>
                  {report.picture && (
                    <div className="mt-2">
                      <img
                        src={report.picture}
                        alt="Report"
                        className="w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AddReportModal
        isOpen={showAddReport}
        onClose={() => setShowAddReport(false)}
        eventId={selectedEvent.id}
        eventCategory={selectedEvent.category}
        onReportAdded={handleReportAdded}
      />

      <FlagReportModal
        isOpen={!!reportToFlag}
        reportId={reportToFlag}
        onClose={() => setReportToFlag(null)}
        onSuccess={handleFlagSuccess}
      />
    </>
  ) : null;
}