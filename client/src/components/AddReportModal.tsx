import React, { useState } from "react";
import { X, Camera, Star } from "lucide-react";
import { createReport } from "../api/reportsApi";
import { useAppSelector } from "../store/hooks";

interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: number;
  spotId?: number;
  eventCategory?: string;
  onReportAdded: () => void;
}

const AddReportModal: React.FC<AddReportModalProps> = ({
  isOpen,
  onClose,
  eventId,
  spotId,
  eventCategory,
  onReportAdded,
}) => {
  const { token } = useAppSelector((state) => state.auth);
  const [description, setDescription] = useState("");
  const [score, setScore] = useState<number | undefined>(undefined);
  const [picture, setPicture] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getScoreLabel = () => {
    if (!eventCategory) return "Rating";
    
    const category = eventCategory.toLowerCase();
    if (category.includes("beach")) return "Wave Level";
    if (category.includes("parking")) return "Crowdedness";
    if (category.includes("traffic")) return "Traffic Level";
    return "Rating";
  };

  const getScoreDescription = (value: number) => {
    const category = eventCategory?.toLowerCase() || "";
    
    if (category.includes("beach")) {
      const waveLabels = ["Calm", "Small", "Moderate", "Good", "Excellent"];
      return waveLabels[value - 1] || "";
    }
    
    if (category.includes("parking")) {
      const crowdLabels = ["Empty", "Few cars", "Moderate", "Busy", "Full"];
      return crowdLabels[value - 1] || "";
    }
    
    if (category.includes("traffic")) {
      const trafficLabels = ["Clear", "Light", "Moderate", "Heavy", "Gridlock"];
      return trafficLabels[value - 1] || "";
    }
    
    return "";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError("You must be logged in to add a report");
      return;
    }

    if (!description.trim()) {
      setError("Please add a description");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createReport(token, {
        description,
        picture: picture || undefined,
        event_id: eventId,
        spot_id: spotId,
        score,
      });

      // Reset form
      setDescription("");
      setScore(undefined);
      setPicture("");
      
      // Notify parent and close
      onReportAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-modal="add-report">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Add Report</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Score/Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {getScoreLabel()}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={`p-2 transition-colors ${
                    score && score >= value
                      ? "text-yellow-500"
                      : "text-gray-300"
                  } hover:text-yellow-400`}
                >
                  <Star
                    size={32}
                    fill={score && score >= value ? "currentColor" : "none"}
                  />
                </button>
              ))}
            </div>
            {score && (
              <p className="text-sm text-gray-600 mt-1">
                {getScoreDescription(score)}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your experience..."
              required
            />
          </div>

          {/* Picture Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photo (optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer">
                <Camera size={20} />
                <span className="text-sm">Choose Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {picture && (
                <button
                  type="button"
                  onClick={() => setPicture("")}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            {picture && (
              <div className="mt-3">
                <img
                  src={picture}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReportModal;
