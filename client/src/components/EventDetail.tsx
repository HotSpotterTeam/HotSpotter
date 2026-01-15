import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Camera, Navigation, Flag, Star } from "lucide-react";
import { RootState } from "../state/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEvent } from "../state/AppSlice";
import { Event, Report } from "../generated-types";
import { getReports, flagReport } from "../api/reportsApi";
import { useAppSelector } from "../store/hooks";
import AddReportModal from "./AddReportModal";

export default function EventDetail() {
  const selectedEvent = useSelector(
    (state: RootState) => state.app.selectedEvent
  );
  const dispatch = useDispatch();
  const { token } = useAppSelector((state) => state.auth);
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const onClose = () => {
    dispatch(setSelectedEvent(null));
    setShowAddReport(false); // Reset modal state when closing
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside the detail window or the add report modal
      if (
        detailRef.current && 
        !detailRef.current.contains(event.target as Node) &&
        !document.querySelector('[data-modal="add-report"]')?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (selectedEvent) {
      // Add listener with a slight delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedEvent]);

  // Fetch reports when event is selected
  useEffect(() => {
    if (selectedEvent?.id) {
      setLoading(true);
      getReports(selectedEvent.id, undefined, false)
        .then(setReports)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedEvent?.id]);

  const handleFlagReport = async (reportId: number) => {
    if (!token) {
      alert("You must be logged in to flag a report");
      return;
    }

    if (!confirm("Are you sure you want to flag this report as inappropriate?")) {
      return;
    }

    try {
      await flagReport(token, reportId);
      // Remove flagged report from the list
      setReports(reports.filter(r => r.id !== reportId));
    } catch (err: any) {
      alert(err.message || "Failed to flag report");
    }
  };

  const handleReportAdded = () => {
    // Refresh reports list
    if (selectedEvent?.id) {
      getReports(selectedEvent.id, undefined, false)
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
            <span className="font-medium">{selectedEvent?.status}</span>
            {selectedEvent?.start_time && (
              <>
                <span>•</span>
                <span>{new Date(selectedEvent.start_time).toLocaleDateString('en-GB')}</span>
              </>
            )}
          </div>
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
          <button className="flex items-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm">
            <Navigation size={18} />
            Navigate
          </button>
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
    </>
  ) : null;
}

