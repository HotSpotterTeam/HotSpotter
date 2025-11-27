import React from 'react';
import { MapPin, Bell, User } from 'lucide-react';

const TopBar = () => {
  return (
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
  );
};

export default TopBar;

