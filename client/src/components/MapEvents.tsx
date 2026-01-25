import { useEffect, useRef, useCallback } from "react";
import { useMapEvents } from "react-leaflet";
import { useAppSelector } from "../store/hooks";
import {
  setCreateSpotLocation,
  setCreateEventLocation,
  setCurrentUserLocation,
  setOnChooseLocation,
  setOnChooseEventLocation,
  setShowCreateSpot,
  setShowCreateEvent,
  setMapBounds,
  setMapZoom,
} from "../state/AppSlice";
import { useDispatch } from "react-redux";
import { Bounds } from "../queries";
import { TEL_AVIV_DEFAULT } from "../constants";

export default function MapEvents() {
  const onChooseLocation = useAppSelector(
    (state) => state.app.onChooseLocation
  );
  const onChooseEventLocation = useAppSelector(
    (state) => state.app.onChooseEventLocation
  );
  const dispatch = useDispatch();
  const hasCenteredRef = useRef(false);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const updateBounds = useCallback(() => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    
    const mapBounds: Bounds = {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    };
    
    dispatch(setMapBounds(mapBounds));
    dispatch(setMapZoom(zoom));
  }, []);

  const debouncedUpdateBounds = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      updateBounds();
    }, 500); // Wait 500ms after user stops moving/zooming
  }, [updateBounds]);

  const map = useMapEvents({
    click: (e) => {
      if (onChooseLocation) {
        dispatch(
          setCreateSpotLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
        );
        dispatch(setOnChooseLocation(false));
        dispatch(setShowCreateSpot(true));
      } else if (onChooseEventLocation) {
        dispatch(
          setCreateEventLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
        );
        dispatch(setOnChooseEventLocation(false));
        dispatch(setShowCreateEvent(true));
      }
    },
    moveend: () => {
      debouncedUpdateBounds();
    },
    zoomend: () => {
      debouncedUpdateBounds();
    },
    locationfound: (e) => {
      console.log("User location found:", e);
      dispatch(
        setCurrentUserLocation({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        })
      );
      if (!hasCenteredRef.current) {
        map.setView(e.latlng, 16);
        hasCenteredRef.current = true;
      }
    },
    locationerror: (e) => {
      console.error("Location error:", e);
      // Center on Tel Aviv if location fails
      if (!hasCenteredRef.current) {
        map.setView([TEL_AVIV_DEFAULT.lat, TEL_AVIV_DEFAULT.lng], 16);
        hasCenteredRef.current = true;
      }
    },
  });

  // Request user's location and set initial bounds when component mounts
  useEffect(() => {
    // Set initial bounds immediately so queries can run
    updateBounds();

    map.locate({
      enableHighAccuracy: true,
      watch: false, // Set to true if you want continuous updates
      timeout: 10000,
      maximumAge: 0,
    });
  }, []);

  return null;
}
