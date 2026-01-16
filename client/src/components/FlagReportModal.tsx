import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { flagReport } from "../api/reportsApi";

interface FlagReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number | null;
  onSuccess: () => void;
}

const FLAG_CATEGORIES = [
  "Inappropriate Content",
  "Spam / Advertising",
  "False Information",
  "Harassment / Hate Speech",
  "Irrelevant Content",
  "Other"
];

export default function FlagReportModal({ isOpen, onClose, reportId, onSuccess }: FlagReportModalProps) {
  const { token } = useAppSelector((state) => state.auth);
  const [category, setCategory] = useState(FLAG_CATEGORIES[0]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !reportId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      await flagReport(token, reportId, category, reason);
      onSuccess();
      onClose();
      // Reset form
      setReason("");
      setCategory(FLAG_CATEGORIES[0]);
    } catch (err: any) {
      setError(err.message || "Failed to flag report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div id="flag-modal-content" className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={20} />
            <h3 className="font-bold">Flag Report</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why are you flagging this?
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block"
            >
              {FLAG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Please provide specific details to help our moderators..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:outline-none focus:ring-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Flag Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}