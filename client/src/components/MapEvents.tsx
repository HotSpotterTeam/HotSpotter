import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";
import { useAppSelector } from "../store/hooks";
import {
  setCreateSpotLocation,
  setCurrentUserLocation,
  setOnChooseLocation,
  setShowCreateSpot,
} from "../state/AppSlice";
import { useDispatch } from "react-redux";

export default function MapEvents() {
  const onChooseLocation = useAppSelector(
    (state) => state.app.onChooseLocation
  );
  const dispatch = useDispatch();
  const map = useMapEvents({
    click: (e) => {
      console.log(e);
      if (onChooseLocation) {
        map.setView(e.latlng, 13);
        // Convert LatLng object to plain serializable object
        dispatch(
          setCreateSpotLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
        );
        dispatch(setOnChooseLocation(false));
        dispatch(setShowCreateSpot(true));
      }
    },
    locationfound: (e) => {
      console.log("User location found:", e);
      dispatch(
        setCurrentUserLocation({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        })
      );
      // Optionally center the map on user's location
      map.setView(e.latlng, 16);
    },
    locationerror: (e) => {
      console.error("Location error:", e);
      // Handle location error (user denied permission, etc.)
    },
  });

  // Request user's location when component mounts
  useEffect(() => {
    map.locate({
      enableHighAccuracy: true,
      watch: false, // Set to true if you want continuous updates
      timeout: 10000,
      maximumAge: 0,
    });
  }, []);

  return null;
}
