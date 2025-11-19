import React, { useState, useEffect } from 'react';
import { MapPin, Search, Plus, User, Filter, Clock, Navigation, TrendingUp, Camera, MessageSquare, ThumbsUp, Bell } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
// Import marker images so Vite can bundle them correctly
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon paths for Leaflet when using bundlers (Vite)
(delete (L.Icon.Default.prototype as any)._getIconUrl);
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Small helper component: forces Leaflet to recalculate size after mount and on resize
function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    // Invalidate after a short delay to allow layout to settle
    const t = setTimeout(() => map.invalidateSize(), 250);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

const HotSpotter = () => {
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [showCreateSpot, setShowCreateSpot] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: '🗺️', color: 'bg-gray-500' },
    { id: 'beach', name: 'Beach', icon: '🏖️', color: 'bg-blue-500' },
    { id: 'parking', name: 'Parking', icon: '🅿️', color: 'bg-purple-500' },
    { id: 'sports', name: 'Sports', icon: '⚽', color: 'bg-green-500' },
    { id: 'traffic', name: 'Traffic', icon: '🚗', color: 'bg-red-500' },
  ];

  const spots = [
    {
      id: 1,
      title: 'Haifa Cable Car Beach',
      category: 'beach',
      description: 'Wave conditions and crowd status',
      lastReport: '5m ago',
      reports: 12,
      distance: '0.8 km',
      status: 'active',
      lat: 32.8314679759848, 
      lng: 34.970290283112355,
      upvotes: 8
    },
    {
      id: 2,
      title: 'Sammy Ofer Stadium Parking',
      category: 'parking',
      description: 'Match day parking availability',
      lastReport: '12m ago',
      reports: 24,
      distance: '1.2 km',
      status: 'active',
      lat: 32.78448667133754,
      lng: 34.96513931194677,
      upvotes: 15
    },
  ];

  const recentReports = [
    {
      id: 1,
      user: 'Sarah M.',
      time: '2m ago',
      content: 'Lots of free spots on level 3!',
      image: true,
      upvotes: 5
    },
    {
      id: 2,
      user: 'David K.',
      time: '5m ago',
      content: 'Waves are perfect today, not too crowded',
      image: false,
      upvotes: 8
    },
    {
      id: 3,
      user: 'Rachel L.',
      time: '8m ago',
      content: 'Field is occupied until 6 PM',
      image: true,
      upvotes: 3
    },
  ];

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.color : 'bg-gray-500';
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : '📍';
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-md z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800">HotSpotter</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full relative">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200">
            <User size={18} className="text-gray-600" />
            <span className="text-sm font-medium">Profile</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 bg-white shadow-lg flex flex-col z-10">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search spots or locations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Categories</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
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

          {/* Spots List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Nearby Spots</h2>
                <span className="text-sm text-gray-500">{spots.length} active</span>
              </div>

              <div className="space-y-3">
                {spots.map(spot => (
                  <div
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedSpot?.id === spot.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(spot.category)}</span>
                        <div>
                          <h3 className="font-semibold text-gray-800">{spot.title}</h3>
                          <p className="text-sm text-gray-500">{spot.description}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(spot.category)} text-white`}>
                        {spot.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {spot.lastReport}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {spot.reports}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={14} />
                          {spot.upvotes}
                        </span>
                      </div>
                      <span className="text-blue-600 font-medium">{spot.distance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-green-50">
          {/* Map (Leaflet) - keep map at the back (z-0) so UI overlays render above it */}
          <div className="w-full h-full relative z-0">
            <MapContainer center={[32.8191, 34.9983]} zoom={13} className="w-full h-full z-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <InvalidateMapSize />

              {spots.map(spot => (
                <Marker
                  key={spot.id}
                  position={[spot.lat, spot.lng]}
                  eventHandlers={{
                    click: () => setSelectedSpot(spot),
                  }}
                >
                  <Popup>
                    <div>
                      <strong>{spot.title}</strong>
                      <div className="text-sm text-gray-600">{spot.description}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Floating Action Button */}
          <button
            onClick={() => setShowCreateSpot(!showCreateSpot)}
            className="absolute bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110 z-40"
          >
            <Plus size={28} />
          </button>

          {/* Spot Detail Panel */}
          {selectedSpot && (
            <div className="absolute bottom-8 left-8 w-96 bg-white rounded-lg shadow-2xl p-6 z-50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{selectedSpot.title}</h3>
                  <p className="text-sm text-gray-600">{selectedSpot.description}</p>
                </div>
                <button
                  onClick={() => setSelectedSpot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="font-medium">{selectedSpot.reports} reports</span>
                  <span>•</span>
                  <span>{selectedSpot.lastReport}</span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Reports</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {recentReports.map(report => (
                    <div key={report.id} className="bg-gray-50 rounded p-3">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{report.user}</span>
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
          )}

          {/* Create Spot Modal */}
          {showCreateSpot && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
              <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Spot</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Beach at Haifa Port"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Beach</option>
                      <option>Parking</option>
                      <option>Sports</option>
                      <option>Traffic</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      placeholder="What should people know about this location?"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="Click on map or enter address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateSpot(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
                    Create Spot
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotSpotter;
