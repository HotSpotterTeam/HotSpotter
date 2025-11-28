import React, { useState } from 'react';
import { Filter } from 'lucide-react';

export default function Sidebar({
  categories,
  spots,
  onSelectSpot,
}: any) {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className="w-96 bg-white shadow-lg flex flex-col z-10">
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Search spots or locations..."
            className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Categories</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === cat.id
                  ? `${cat.color} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Nearby Spots</h2>
            <span className="text-sm text-gray-500">{spots.length} active</span>
          </div>

          <div className="space-y-3">
            {spots.map((spot: any) => (
              <div
                key={spot.id}
                onClick={() => onSelectSpot(spot)}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md border-gray-200 bg-white`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📍</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{spot.title}</h3>
                      <p className="text-sm text-gray-500">{spot.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded bg-gray-500 text-white`}>{spot.category}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">{spot.lastReport}</span>
                    <span className="flex items-center gap-1">{spot.reports}</span>
                    <span className="flex items-center gap-1">{spot.upvotes}</span>
                  </div>
                  <span className="text-blue-600 font-medium">{spot.distance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
