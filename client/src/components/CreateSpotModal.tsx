import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../state/store";
import {
  setCreateSpotLocation,
  setOnChooseLocation,
  setShowCreateSpot,
  Location,
} from "../state/AppSlice";
import { MapPin } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../store/hooks";
import { useFormik } from "formik";
import * as Yup from "yup";
import SpotCreatedSuccess from "./SpotCreatedSuccess";

function getLocationString(location: Location | null, value: string): string {
  return location ? `${location.lat}, ${location.lng}` : value;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Please enter a title")
    .min(3, "Title must be at least 3 characters"),
  category: Yup.string().required("Please select a category"),
  description: Yup.string().trim(),
});

export default function CreateSpotModal() {
  const showCreateSpot = useSelector(
    (state: RootState) => state.app.showCreateSpot
  );
  const dispatch = useDispatch();
  const createSpotLocation = useSelector(
    (state: RootState) => state.app.createSpotLocation
  );
  const queryClient = useQueryClient();
  const { token } = useAppSelector((state) => state.auth);
  const [locationError, setLocationError] = React.useState<string>("");
  const [showSuccess, setShowSuccess] = React.useState(false);

  const createSpotMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      location: [number, number];
      category: string;
      spot_type: string;
      address?: string;
    }) => {
      const API_URL =
        import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
        "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/api/spots/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Failed to create spot" }));
        throw new Error(error.message || "Failed to create spot");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch spots list
      queryClient.invalidateQueries({ queryKey: ["spots"] });
      // Show success message
      setShowSuccess(true);
      // Reset form fields
      formik.resetForm();
    },
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      description: "",
      category: "",
    },
    validationSchema,
    onSubmit: (values) => {
      if (!createSpotLocation) {
        setLocationError("Please select a location on the map");
        return;
      }

      setLocationError("");

      createSpotMutation.mutate({
        name: values.name.trim(),
        description: values.description.trim() || "",
        location: [createSpotLocation.lat, createSpotLocation.lng],
        category: values.category,
        spot_type: "permanent",
      });
    },
  });

  const onClose = () => {
    dispatch(setShowCreateSpot(false));
    dispatch(setOnChooseLocation(false));
    formik.resetForm();
    dispatch(setCreateSpotLocation(null));
    setLocationError("");
    setShowSuccess(false);
  };

  // Clear location error when location is selected
  React.useEffect(() => {
    if (createSpotLocation) {
      setLocationError("");
    }
  }, [createSpotLocation]);
  return showCreateSpot ? (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
        {showSuccess ? (
          <SpotCreatedSuccess onClose={onClose} />
        ) : (
          // Form
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Create New Spot
            </h2>

        {(createSpotMutation.isError || locationError) && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 rounded-lg">
            <p className="text-sm text-red-700">
              {createSpotMutation.error instanceof Error
                ? createSpotMutation.error.message
                : locationError || "Failed to create spot. Please try again."}
            </p>
          </div>
        )}

        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="spot-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              id="spot-title"
              name="name"
              type="text"
              placeholder="e.g., Beach at Haifa Port"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                formik.errors.name && formik.touched.name
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
              htmlFor="spot-category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category
            </label>
            <select
              id="spot-category"
              name="category"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                formik.errors.category && formik.touched.category
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              autoComplete="off"
              value={formik.values.category}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              <option value="">Select a category</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="bar">Bar</option>
              <option value="parking">Parking</option>
              <option value="shop">Shop</option>
              <option value="community_centre">Community Centre</option>
              <option value="other">Other</option>
            </select>
            {formik.errors.category && formik.touched.category && (
              <p className="mt-1 text-sm text-red-600">
                {formik.errors.category}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="spot-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="spot-description"
              name="description"
              placeholder="What should people know about this location?"
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
              htmlFor="spot-location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <div className="flex items-center gap-2">
              <input
                id="spot-location"
                name="location"
                type="text"
                placeholder="Click on map or enter address"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  locationError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                value={getLocationString(createSpotLocation, "")}
                readOnly
                autoComplete="off"
              />
              <button
                type="button"
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  dispatch(setShowCreateSpot(false));
                  dispatch(setOnChooseLocation(true));
                  dispatch(setCreateSpotLocation(null));
                  setLocationError("");
                }}
              >
                <MapPin size={16} />
              </button>
            </div>
            {locationError && (
              <p className="mt-1 text-sm text-red-600">{locationError}</p>
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
              disabled={createSpotMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSpotMutation.isPending ? "Creating..." : "Create Spot"}
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  ) : null;
}
