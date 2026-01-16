import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../state/store";
import {
  setCreateEventLocation,
  setOnChooseEventLocation,
  setShowCreateEvent,
  Location,
} from "../state/AppSlice";
import { MapPin, Calendar, MapPinned, Navigation, Clock } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../store/hooks";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getCategories } from "../api/utilsApi";

interface CreateEventModalProps {
  initialData?: any;
  isOpen?: boolean;
  onCloseOverride?: () => void;
}

function getLocationString(location: Location | null, value: string): string {
  return location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : value;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Please enter event name")
    .min(3, "Name must be at least 3 characters"),
  category: Yup.string().required("Please select a category"),
  description: Yup.string().trim(),
  externalLink: Yup.string().url("Please enter a valid URL").nullable(),
  startTime: Yup.string().required("Please enter start time"),
  endTime: Yup.string()
    .required("Please enter end time")
    .test("is-after-start", "End time must be after start time", function (value) {
      const { startTime } = this.parent;
      if (!startTime || !value) return true;
      return new Date(value) > new Date(startTime);
    }),
});

export default function CreateEventModal({ initialData, isOpen, onCloseOverride }: CreateEventModalProps) {
  const showCreateEventRedux = useSelector((state: RootState) => state.app.showCreateEvent);
  const showCreateEvent = isOpen !== undefined ? isOpen : showCreateEventRedux;
  const dispatch = useDispatch();
  const createEventLocation = useSelector(
    (state: RootState) => state.app.createEventLocation
  );
  const currentUserLocation = useSelector(
    (state: RootState) => state.app.currentUserLocation
  );
  const queryClient = useQueryClient();
  const { token } = useAppSelector((state) => state.auth);
  const [locationError, setLocationError] = React.useState<string>("");
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [locationType, setLocationType] = useState<"spot" | "custom" | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const [spotSearchTerm, setSpotSearchTerm] = useState("");
  const [showSpotDropdown, setShowSpotDropdown] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const API_URL =
    import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

  // Fetch approved spots for dropdown
  const { data: spotsData } = useQuery({
    queryKey: ["spots-for-event"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/spots/?is_approved=true`);
      if (!response.ok) throw new Error("Failed to fetch spots");
      return response.json();
    },
    enabled: showCreateEvent,
  });

  const spots = spotsData?.spots || [];

  // Filter spots based on search term
  const filteredSpots = spots.filter((spot: any) =>
    spot.name.toLowerCase().includes(spotSearchTerm.toLowerCase()) ||
    spot.category.toLowerCase().includes(spotSearchTerm.toLowerCase())
  );

  // Get selected spot details
  const selectedSpot = spots.find((spot: any) => spot.id === selectedSpotId);

  useEffect(() => {
    if (initialData && showCreateEvent) {
      // 1. Format Dates
      const formatTime = (isoString: string) =>
        isoString ? new Date(isoString).toISOString().slice(0, 16) : "";

      formik.setValues({
        name: initialData.name,
        description: initialData.description || "",
        category: initialData.category,
        externalLink: initialData.external_link || "",
        startTime: formatTime(initialData.start_time),
        endTime: formatTime(initialData.end_time),
      });

      // 2. Handle Location Type
      if (initialData.spot_id) {
        setLocationType("spot");
        setSelectedSpotId(initialData.spot_id);
        // maybe fetch the spot name here to show it in the UI
      } else if (initialData.location) {
        setLocationType("custom");
        const lat = Array.isArray(initialData.location) ? initialData.location[1] : initialData.location.lat;
        const lng = Array.isArray(initialData.location) ? initialData.location[0] : initialData.location.lng;
        dispatch(setCreateEventLocation({ lat, lng }));
      }
    }
  }, [initialData, showCreateEvent]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    if (showCreateEvent) {
      fetchCategories();
    }
  }, [showCreateEvent]);

  const createEventMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      start_time: string;
      end_time: string;
      category: string;
      external_link?: string;
      spot_id?: number;
      custom_location?: [number, number];
    }) => {
      const url = initialData
        ? `${API_URL}/api/events/${initialData.id}`
        : `${API_URL}/api/events/`;
      const method = initialData ? "PUT" : "POST";
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Failed to create event" }));
        throw new Error(error.detail || error.message || "Failed to create event");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setCreatedEvent(data.data);
      setShowSuccess(true);
      formik.resetForm();
      setLocationType(null);
      setSelectedSpotId(null);
    },
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      category: "",
      externalLink: "",
      startTime: "",
      endTime: "",
    },
    validationSchema,
    onSubmit: (values) => {
      // Validate location choice
      if (locationType === "spot" && !selectedSpotId) {
        setLocationError("Please select a spot");
        return;
      }

      if (locationType === "custom" && !createEventLocation) {
        setLocationError("Please select a location on the map");
        return;
      }

      if (!locationType) {
        setLocationError("Please choose a location type (existing spot or custom location)");
        return;
      }

      setLocationError("");

      const eventData: any = {
        name: values.name.trim(),
        description: values.description.trim() || "",
        start_time: values.startTime,
        end_time: values.endTime,
        category: values.category,
        external_link: values.externalLink.trim() || undefined,
      };

      if (locationType === "spot") {
        eventData.spot_id = selectedSpotId;
      } else {
        // Backend expects [lng, lat] format for custom_location
        eventData.custom_location = [createEventLocation!.lng, createEventLocation!.lat];
      }

      createEventMutation.mutate(eventData);
    },
  });

  const onClose = () => {
    if (onCloseOverride) {
      onCloseOverride();
    } else {
      dispatch(setShowCreateEvent(false));
      dispatch(setOnChooseEventLocation(false));
    }
    formik.resetForm();
    dispatch(setCreateEventLocation(null));
    setLocationError("");
    setShowSuccess(false);
    setCreatedEvent(null);
    setLocationType(null);
    setSelectedSpotId(null);
    setSpotSearchTerm("");
    setShowSpotDropdown(false);
  };

  const handleUseCurrentLocation = () => {
    if (currentUserLocation) {
      setLocationType("custom");
      dispatch(setCreateEventLocation(currentUserLocation));
      setLocationError("");
    } else {
      setLocationError("Current location not available. Please allow location access.");
    }
  };

  const handleChooseOnMap = () => {
    setLocationType("custom");
    dispatch(setShowCreateEvent(false));
    dispatch(setOnChooseEventLocation(true));
    dispatch(setCreateEventLocation(null));
    setLocationError("");
  };

  // Clear location error when location is selected
  useEffect(() => {
    if (createEventLocation || selectedSpotId) {
      setLocationError("");
    }
  }, [createEventLocation, selectedSpotId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.spot-search-container')) {
        setShowSpotDropdown(false);
      }
    };

    if (showSpotDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSpotDropdown]);

  // Get current date-time in local format for min attribute
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return showCreateEvent ? (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="text-center py-8">
            <div className={`w-16 h-16 ${createdEvent?.status === 'pending' ? 'bg-orange-100' : createdEvent?.status === 'pending-start' ? 'bg-yellow-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {createdEvent?.status === "pending" && <Clock className="text-orange-600" size={32} />}
              {createdEvent?.status === "pending-start" && <Clock className="text-yellow-600" size={32} />}
              {createdEvent?.status === "active" && <Calendar className="text-green-600" size={32} />}
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {createdEvent?.status === "pending" && "Event Awaiting Approval"}
              {createdEvent?.status === "pending-start" && "Event Scheduled"}
              {createdEvent?.status === "active" && (initialData ? "Event Updated!" : "Event Created!")}
            </h3>
            <p className="text-gray-600 mb-6">
              {status === "pending" &&
                "Your event needs approval by the spot owner. You'll be notified once approved."}

              {status === "pending-start" &&
                "Waiting for the event to start."}

              {status === "active" &&
                "Your event has been created successfully."}
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {initialData ? "Edit Event" : "Create New Event"}
            </h2>

            {(createEventMutation.isError || locationError) && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg">
                <p className="text-sm text-red-700">
                  {createEventMutation.error instanceof Error
                    ? createEventMutation.error.message
                    : locationError || "Failed to create event. Please try again."}
                </p>
              </div>
            )}

            <form onSubmit={formik.handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="event-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Event Name
                </label>
                <input
                  id="event-name"
                  name="name"
                  type="text"
                  placeholder="e.g., Beach Volleyball Tournament"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formik.errors.name && formik.touched.name
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                    }`}
                  autoComplete="off"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.errors.name && formik.touched.name && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="event-category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category
                </label>
                <select
                  id="event-category"
                  name="category"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formik.errors.category && formik.touched.category
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                    }`}
                  autoComplete="off"
                  value={formik.values.category}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
                {formik.errors.category && formik.touched.category && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.category}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="event-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="event-description"
                  name="description"
                  placeholder="Describe your event..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="off"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>

              <div>
                <label
                  htmlFor="event-link"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Website / Link (Optional)
                </label>
                <input
                  id="event-link"
                  name="externalLink"
                  type="url"
                  placeholder="https://ticket-page.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    formik.errors.externalLink && formik.touched.externalLink
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  autoComplete="off"
                  value={formik.values.externalLink}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                 {formik.errors.externalLink && formik.touched.externalLink && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.externalLink}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="event-start"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    id="event-start"
                    name="startTime"
                    type="datetime-local"
                    min={minDateTime}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formik.errors.startTime && formik.touched.startTime
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                      }`}
                    value={formik.values.startTime}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.errors.startTime && formik.touched.startTime && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.startTime}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="event-end"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    End Time
                  </label>
                  <input
                    id="event-end"
                    name="endTime"
                    type="datetime-local"
                    min={formik.values.startTime || minDateTime}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formik.errors.endTime && formik.touched.endTime
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                      }`}
                    value={formik.values.endTime}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.errors.endTime && formik.touched.endTime && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.endTime}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Event Location
                </label>

                <div className="space-y-3">
                  {/* Option 1: Existing Spot */}
                  <div
                    className={`border-2 rounded-lg p-3 transition-colors ${locationType === "spot"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div
                      className="flex items-center gap-2 mb-2 cursor-pointer"
                      onClick={() => {
                        setLocationType("spot");
                        dispatch(setCreateEventLocation(null));
                      }}
                    >
                      <MapPinned size={18} className="text-blue-600" />
                      <span className="font-medium text-sm">At Existing Spot</span>
                    </div>
                    {locationType === "spot" && (
                      <div className="relative spot-search-container">
                        <input
                          type="text"
                          placeholder="Search spots..."
                          value={spotSearchTerm}
                          onChange={(e) => {
                            setSpotSearchTerm(e.target.value);
                            setShowSpotDropdown(true);
                          }}
                          onFocus={() => setShowSpotDropdown(true)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {selectedSpot && !showSpotDropdown && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                            <strong>{selectedSpot.name}</strong> ({selectedSpot.category})
                          </div>
                        )}
                        {showSpotDropdown && filteredSpots.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredSpots.map((spot: any) => (
                              <div
                                key={spot.id}
                                onClick={() => {
                                  setSelectedSpotId(spot.id);
                                  setSpotSearchTerm(spot.name);
                                  setShowSpotDropdown(false);
                                }}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                              >
                                <div className="font-medium text-gray-800">{spot.name}</div>
                                <div className="text-xs text-gray-500">{spot.category}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {showSpotDropdown && filteredSpots.length === 0 && spotSearchTerm && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                            No spots found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Option 2: Custom Location */}
                  <div
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-colors ${locationType === "custom"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                    onClick={() => setLocationType("custom")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={18} className="text-blue-600" />
                      <span className="font-medium text-sm">Custom Location</span>
                    </div>
                    {locationType === "custom" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Select location..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={getLocationString(createEventLocation, "")}
                            readOnly
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleChooseOnMap}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <MapPin size={16} />
                            Choose on Map
                          </button>
                          <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            <Navigation size={16} />
                            Current Location
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {locationError && (
                  <p className="mt-2 text-sm text-red-600">{locationError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createEventMutation.isPending ? "Saving..." : (initialData ? "Save Changes" : "Create Event")}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  ) : null;
}
