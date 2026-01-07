import React from "react";
import { MapPin, User, LayoutDashboard } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../state/store";
import { useAppSelector } from "../store/hooks";
import GoogleSignInButton from "./GoogleSignInButton";
import UserProfile from "./UserProfile";
import NotificationsPanel from "./NotificationsPanel";
import { setShowAdminDashboard, setShowUserProfile, setShowCreateEvent, setShowCreateSpot } from "../state/AppSlice";

const TopBar = () => {
  const events = useSelector((state: RootState) => state.events.events);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const showAdminDashboard = useAppSelector((state: RootState) => state.app.showAdminDashboard);
  const showUserProfile = useAppSelector((state: RootState) => state.app.showUserProfile);
  const dispatch = useDispatch();

  const handleAdminClick = () => {
    dispatch(setShowUserProfile(false));
    dispatch(setShowAdminDashboard(!showAdminDashboard));
  };

  const handleProfileClick = () => {
    dispatch(setShowAdminDashboard(false));
    dispatch(setShowUserProfile(!showUserProfile));
  };

  const handleMapClick = () => {
    dispatch(setShowAdminDashboard(false));
    dispatch(setShowUserProfile(false));
  };

  console.log("events", events);

  return (
    <nav className="bg-white shadow-md z-20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={handleMapClick}>
        <MapPin className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">HotSpotter</h1>
      </div>

      {isAuthenticated && (
        <div className="absolute left-80 ml-4 flex items-center gap-3">
          <button
            onClick={() => dispatch(setShowCreateEvent(true))}
            className="bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
          >
            Create Event
          </button>
          <button
            onClick={() => dispatch(setShowCreateSpot(true))}
            className="bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
          >
            Create Spot
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <>
            <NotificationsPanel />
            {user?.is_admin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
              >
                <LayoutDashboard size={18} />
                <span>{showAdminDashboard ? "Map" : "Admin"}</span>
              </button>
            )}
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 bg-white text-gray-700 border-2 border-gray-300 px-5 py-2.5 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium text-sm"
            >
              <User size={18} />
              <span>{showUserProfile ? "Map" : "Profile"}</span>
            </button>
            <UserProfile />
          </>
        )}
        {!isAuthenticated && <GoogleSignInButton />}
      </div>
    </nav>
  );
};

export default TopBar;