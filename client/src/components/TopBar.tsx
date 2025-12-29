import React from "react";
import { MapPin, Bell, User, LayoutDashboard } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../state/store";
import { useAppSelector } from "../store/hooks";
import GoogleSignInButton from "./GoogleSignInButton";
import UserProfile from "./UserProfile";
import { setShowAdminDashboard, setShowUserProfile } from "../state/AppSlice";

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

      <div className="flex items-center gap-4">
        {isAuthenticated && (
          <>
            {user?.is_admin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 transition-colors"
              >
                <LayoutDashboard size={18} />
                <span>{showAdminDashboard ? "Map" : "Admin"}</span>
              </button>
            )}
            <button
              onClick={handleProfileClick}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
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