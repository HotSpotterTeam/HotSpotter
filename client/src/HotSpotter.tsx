import { useEffect, useState } from "react";

import CreateSpotModal from "./components/CreateSpotModal";
import CreateEventModal from "./components/CreateEventModal";
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
import SpotDetail from "./components/SpotDetail";

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

  const eventsFromStore = useSelector(
    (state: RootState) => state.events.events
  );
  const eventsList = Array.isArray(eventsFromStore) ? eventsFromStore : [];

  const onSelectMapItem = (item: any, type: "spot" | "event") => {
    if (type === "spot") {
      // It's a spot, save to selectedSpot
      dispatch(setSelectedSpot(item));
    } else {
      // It's an event, save to selectedEvent
      const event = eventsList.find((e: Event) => e.id === item.id) || item;
      dispatch(setSelectedEvent(event));
    }
  };

  const onToggleCreate = () => {
    dispatch(setShowCreateSpot(!showCreateSpot));
  };

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
            events={eventsList}
            isLoading={eventsLoading}
            error={eventsError}
          />
          <MapView
            onSelectSpot={onSelectMapItem}
          />
          <EventDetail />
          <SpotDetail />
          <CreateSpotModal />
          <CreateEventModal />
        </div>
      )}
    </div>
  );
};

export default HotSpotter;
