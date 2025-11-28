import { useState } from 'react';

import CreateSpotModal from './components/CreateSpotModal';
import SpotDetail from './components/SpotDetail';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import TopBar from './components/TopBar';
import { useQuery } from '@tanstack/react-query';
import { useEvents } from './queries';


const HotSpotter = () => {
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [showCreateSpot, setShowCreateSpot] = useState(false);
  const { isPending, error, data } = useEvents();

  console.log(data);


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

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
          <Sidebar categories={categories} spots={spots} onSelectSpot={setSelectedSpot} />
          <MapView spots={spots} onSelectSpot={setSelectedSpot} onToggleCreate={() => setShowCreateSpot(!showCreateSpot)} />
          <SpotDetail selectedSpot={selectedSpot} recentReports={recentReports} onClose={() => setSelectedSpot(null)} />
          <CreateSpotModal show={showCreateSpot} onClose={() => setShowCreateSpot(false)} />
      </div>
    </div>
  );
};

export default HotSpotter;
