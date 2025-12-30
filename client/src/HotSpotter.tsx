import { useEffect, useState } from "react";

import CreateSpotModal from "./components/CreateSpotModal";
import EventDetail from "./components/EventDetail";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import TopBar from "./components/TopBar";
import LoaderComponent from "./components/Loader";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./state/store";
import { Event } from "./generated-types";
import {
  setSelectedSpot,
  setSelectedEvent,
  setShowCreateSpot,
} from "./state/AppSlice";
import AdminDashboard from "./components/AdminDashboard";
import { useEvents } from "./queries";
import UserProfilePage from "./components/UserProfilePage";

const HotSpotter = () => {
  // Fetch events from API
  const { isPending: eventsLoading, error: eventsError } = useEvents();

  const showCreateSpot = useSelector(
    (state: RootState) => state.app.showCreateSpot
  );
  const showAdminDashboard = useSelector(
    (state: RootState) => state.app.showAdminDashboard
  );
  const showUserProfile = useSelector(
    (state: RootState) => state.app.showUserProfile
  );
  const selectedSpot = useSelector(
    (state: RootState) => state.app.selectedSpot
  );
  const dispatch = useDispatch();

  const categories = [
    { id: "all", name: "All", icon: "🗺️", color: "bg-gray-500" },
    { id: "beach", name: "Beach", icon: "🏖️", color: "bg-blue-500" },
    { id: "parking", name: "Parking", icon: "🅿️", color: "bg-purple-500" },
    { id: "sports", name: "Sports", icon: "⚽", color: "bg-green-500" },
    { id: "traffic", name: "Traffic", icon: "🚗", color: "bg-red-500" },
  ];

  const eventsFromStore = useSelector(
    (state: RootState) => state.events.events
  );
  const eventsList = Array.isArray(eventsFromStore) ? eventsFromStore : [];

  const onSelectEventFromMap = (spot: any) => {
    // Find the corresponding event from the events list
    const event = eventsList.find((e: Event) => e.id === spot.id);
    if (event) {
      dispatch(setSelectedEvent(event));
    }
  };
  const onToggleCreate = () => {
    dispatch(setShowCreateSpot(!showCreateSpot));
  };

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
      {showAdminDashboard ? (
        <div className="flex-1 overflow-auto z-10">
          <AdminDashboard />
        </div>
      ) : showUserProfile ? (
        <div className="flex-1 overflow-auto z-10">
          <UserProfilePage />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            categories={categories}
            events={eventsList}
            isLoading={eventsLoading}
            error={eventsError}
          />
          <MapView
            onSelectSpot={onSelectEventFromMap}
            onToggleCreate={onToggleCreate}
          />
          <EventDetail recentReports={recentReports} />
          <CreateSpotModal />
        </div>
      )}
    </div>
  );
};

export default HotSpotter;
