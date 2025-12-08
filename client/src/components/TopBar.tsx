import React from "react";
import { MapPin, Bell, User } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../state/store";
import { useAppSelector } from "../store/hooks";
import GoogleSignInButton from "./GoogleSignInButton";
import UserProfile from "./UserProfile";

const TopBar = () => {
  const events = useSelector((state: RootState) => state.events.events);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  console.log("events", events);
  return (
    <nav className="bg-white shadow-md z-20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MapPin className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">HotSpotter</h1>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <UserProfile />
        ) : (
          <GoogleSignInButton />
        )}
      </div>
    </nav>
  );
};

export default TopBar;
