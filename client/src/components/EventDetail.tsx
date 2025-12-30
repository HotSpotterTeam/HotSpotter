import React from "react";
import { TrendingUp, Camera, ThumbsUp, Navigation } from "lucide-react";
import { RootState } from "../state/store";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedEvent } from "../state/AppSlice";
import { Event } from "../generated-types";

export default function EventDetail({ recentReports }: any) {
  const selectedEvent = useSelector(
    (state: RootState) => state.app.selectedEvent
  );
  const dispatch = useDispatch();
  const onClose = () => {
    dispatch(setSelectedEvent(null));
  };
  return selectedEvent ? (
    <div className="absolute bottom-8 left-8 w-96 bg-white rounded-lg shadow-2xl p-6 z-50">
      <div className="flex items-start justify-between mb-4">
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

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TrendingUp size={16} className="text-green-600" />
          <span className="font-medium">{selectedEvent?.status}</span>
          <span>•</span>
          <span>{selectedEvent?.date}</span>
          <span>•</span>
          <span>{selectedEvent?.time}</span>
        </div>
        {selectedEvent?.category && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-500 text-white">
              {selectedEvent.category}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Recent Reports
        </h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {recentReports.map((report: any) => (
            <div key={report.id} className="bg-gray-50 rounded p-3">
              <div className="flex items-start justify-between mb-1">
                <span className="text-sm font-medium text-gray-800">
                  {report.user}
                </span>
                <span className="text-xs text-gray-500">{report.time}</span>
              </div>
              <p className="text-sm text-gray-700">{report.content}</p>
              {report.image && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Camera size={12} />
                  <span>Photo attached</span>
                </div>
              )}
              <button className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <ThumbsUp size={12} />
                <span>{report.upvotes}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
          Add Report
        </button>
        <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
          <Navigation size={16} />
          Navigate
        </button>
      </div>
    </div>
  ) : null;
}

