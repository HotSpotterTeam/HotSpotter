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
import { setSelectedSpot, setSelectedEvent, setShowCreateSpot } from "./state/AppSlice";
import AdminDashboard from "./components/AdminDashboard";
import { useEvents } from "./queries";

const HotSpotter = () => {
  // Fetch events from API
  const { isPending: eventsLoading, error: eventsError } = useEvents();
  
  const showCreateSpot = useSelector(
    (state: RootState) => state.app.showCreateSpot
  );
  const showAdminDashboard = useSelector(
    (state: RootState) => state.app.showAdminDashboard
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

  const events = useSelector((state: RootState) => state.events.events);
  const eventsList = Array.isArray(events) ? events : [];
  
  // Debug: Log events to console
  useEffect(() => {
    console.log("Events from store:", events);
    console.log("Events list:", eventsList);
    if (eventsError) {
      console.error("Error fetching events:", eventsError);
    }
  }, [events, eventsList, eventsError]);
  
  const spots = eventsList.map((event: Event) => ({
    id: event.id,
    title: event.name,
    category: event.category,
    description: event.description,
    lat: event.location[0],
    lng: event.location[1],
  }));
  
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
      ) : (
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          categories={categories} 
          events={eventsList} 
          isLoading={eventsLoading}
          error={eventsError}
        />
        <MapView
          spots={spots}
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
