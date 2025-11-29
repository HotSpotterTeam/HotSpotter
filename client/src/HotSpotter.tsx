import { useEffect, useState } from "react";

import CreateSpotModal from "./components/CreateSpotModal";
import SpotDetail from "./components/SpotDetail";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import TopBar from "./components/TopBar";
import LoaderComponent from "./components/Loader";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./state/store";
import { Event } from "./generated-types";
import { setSelectedSpot, setShowCreateSpot } from "./state/AppSlice";

const HotSpotter = () => {
  const showCreateSpot = useSelector(
    (state: RootState) => state.app.showCreateSpot
  );
  const selectedSpot = useSelector(
    (state: RootState) => state.app.selectedSpot
  );
  const dispatch = useDispatch();
  const onSelectSpot = (spot: any) => {
    dispatch(setSelectedSpot(spot as Event | null));
  };
  const onToggleCreate = () => {
    dispatch(setShowCreateSpot(!showCreateSpot));
  };
  const categories = [
    { id: "all", name: "All", icon: "🗺️", color: "bg-gray-500" },
    { id: "beach", name: "Beach", icon: "🏖️", color: "bg-blue-500" },
    { id: "parking", name: "Parking", icon: "🅿️", color: "bg-purple-500" },
    { id: "sports", name: "Sports", icon: "⚽", color: "bg-green-500" },
    { id: "traffic", name: "Traffic", icon: "🚗", color: "bg-red-500" },
  ];

  const events = useSelector((state: RootState) => state.events.events);
  const spots = (Array.isArray(events) ? events : []).map((event: Event) => ({
    id: event.id,
    title: event.name,
    category: event.category,
    description: event.description,
    lat: event.location[0],
    lng: event.location[1],
  }));

  const recentReports = [
    {
      id: 1,
      user: "Sarah M.",
      time: "2m ago",
      content: "Lots of free spots on level 3!",
      image: true,
      upvotes: 5,
    },
    {
      id: 2,
      user: "David K.",
      time: "5m ago",
      content: "Waves are perfect today, not too crowded",
      image: false,
      upvotes: 8,
    },
    {
      id: 3,
      user: "Rachel L.",
      time: "8m ago",
      content: "Field is occupied until 6 PM",
      image: true,
      upvotes: 3,
    },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      <TopBar />
      <LoaderComponent />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar categories={categories} spots={spots} />
        <MapView
          spots={spots}
          onSelectSpot={setSelectedSpot}
          onToggleCreate={onToggleCreate}
        />
        <SpotDetail recentReports={recentReports} />
        <CreateSpotModal />
      </div>
    </div>
  );
};

export default HotSpotter;
