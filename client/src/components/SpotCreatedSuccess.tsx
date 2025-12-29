import React from "react";

interface SpotCreatedSuccessProps {
  onClose: () => void;
}

export default function SpotCreatedSuccess({ onClose }: SpotCreatedSuccessProps) {
  return (
    <div className="text-center">
      <div className="mb-4 flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Spot Created Successfully!
      </h2>
      <p className="text-gray-600 mb-6">
        Your spot has been recorded and sent to admin for approval. You'll be notified once it's approved and visible on the map.
      </p>
      <button
        onClick={onClose}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
      >
        Got it!
      </button>
    </div>
  );
}
