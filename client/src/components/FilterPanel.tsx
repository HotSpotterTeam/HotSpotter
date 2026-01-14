import { X, Calendar, CircleDot } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { useDispatch } from "react-redux";
import { setShowFilterPanel, setMapFilters } from "../state/AppSlice";
import { categoryIcons } from "../icons";
import { useState, useRef, useEffect } from "react";

export default function FilterPanel() {
  const dispatch = useDispatch();
  const mapFilters = useAppSelector((state) => state.app.mapFilters);
  const [filterType, setFilterType] = useState<"spots" | "events">("events");
  const panelRef = useRef<HTMLDivElement>(null);

  // Available categories for spots (excluding 'event' and 'default')
  const categories = [...Object.keys(categoryIcons).filter(
    (cat) => cat !== "event" && cat !== "default"
  ), "other"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        dispatch(setShowFilterPanel(false));
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dispatch]);

  const handleCategoryToggle = (category: string) => {
    if (filterType === "spots") {
      const newCategories = mapFilters.spotCategories.includes(category)
        ? mapFilters.spotCategories.filter((c) => c !== category)
        : [...mapFilters.spotCategories, category];
      
      dispatch(setMapFilters({
        ...mapFilters,
        spotCategories: newCategories,
      }));
    } else {
      const newCategories = mapFilters.eventCategories.includes(category)
        ? mapFilters.eventCategories.filter((c) => c !== category)
        : [...mapFilters.eventCategories, category];
      
      dispatch(setMapFilters({
        ...mapFilters,
        eventCategories: newCategories,
      }));
    }
  };

  const handleRemoveAllFilters = () => {
    dispatch(setMapFilters({
      spotCategories: [],
      eventCategories: [],
      timeFilter: { type: "all" },
    }));
  };

  const handleTimeFilterChange = (type: "all" | "today" | "weekend" | "custom") => {
    dispatch(setMapFilters({
      ...mapFilters,
      timeFilter: { type },
    }));
  };

  const handleCustomDateChange = (field: "startDate" | "endDate", value: string) => {
    dispatch(setMapFilters({
      ...mapFilters,
      timeFilter: {
        ...mapFilters.timeFilter,
        type: "custom",
        [field]: value,
      },
    }));
  };

  const handleClose = () => {
    dispatch(setShowFilterPanel(false));
  };

  const hasActiveFilters = 
    mapFilters.spotCategories.length > 0 || 
    mapFilters.eventCategories.length > 0 ||
    mapFilters.timeFilter.type !== "all";

  const currentCategories = filterType === "spots" 
    ? mapFilters.spotCategories 
    : mapFilters.eventCategories;

  return (
    <div 
      ref={panelRef}
      className="absolute top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-[500px] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between rounded-t-lg flex-shrink-0">
        <h3 className="text-base font-semibold text-gray-800">Filter Map</h3>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {/* Remove all filters button */}
        {hasActiveFilters && (
          <button
            onClick={handleRemoveAllFilters}
            className="w-full bg-orange-50 text-orange-600 py-1.5 px-3 rounded-lg hover:bg-orange-100 transition-colors text-xs font-medium"
          >
            Remove All Filters
          </button>
        )}

        {/* Filter Type Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType("spots")}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              filterType === "spots"
                ? "bg-blue-500 text-white shadow-md border-2 border-blue-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
            }`}
          >
            <CircleDot size={14} />
            SPOTS ({mapFilters.spotCategories.length} selected)
          </button>
          <button
            onClick={() => setFilterType("events")}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              filterType === "events"
                ? "bg-orange-500 text-white shadow-md border-2 border-orange-600"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
            }`}
          >
            <Calendar size={14} />
            EVENTS ({mapFilters.eventCategories.length} selected)
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-3 gap-2">
          {categories.map((category) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || categoryIcons.default;
            const isSelected = currentCategories.includes(category);
            
            return (
              <label
                key={`${filterType}-${category}`}
                className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected 
                    ? filterType === "spots"
                      ? "bg-blue-50 border-2 border-blue-200"
                      : "bg-orange-50 border-2 border-orange-200"
                    : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleCategoryToggle(category)}
                  className={`w-3 h-3 rounded focus:ring-1 ${
                    filterType === "spots" 
                      ? "text-blue-600 focus:ring-blue-500" 
                      : "text-orange-600 focus:ring-orange-500"
                  }`}
                />
                <Icon size={14} className="text-gray-600 flex-shrink-0" />
                <span className="text-xs text-gray-700 capitalize truncate">
                  {category.replace(/_/g, " ")}
                </span>
              </label>
            );
          })}
        </div>

        {/* Time Filter for Events */}
        {filterType === "events" && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Time Filter</h4>
            
            {/* Time Filter Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              <button
                onClick={() => handleTimeFilterChange("all")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  mapFilters.timeFilter.type === "all"
                    ? "bg-orange-500 text-white border-2 border-orange-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => handleTimeFilterChange("today")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  mapFilters.timeFilter.type === "today"
                    ? "bg-orange-500 text-white border-2 border-orange-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleTimeFilterChange("tomorrow")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  mapFilters.timeFilter.type === "tomorrow"
                    ? "bg-orange-500 text-white border-2 border-orange-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => handleTimeFilterChange("weekend")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  mapFilters.timeFilter.type === "weekend"
                    ? "bg-orange-500 text-white border-2 border-orange-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                }`}
              >
                Weekend
              </button>
            </div>

            {/* Custom Date Range */}
            <button
              onClick={() => handleTimeFilterChange("custom")}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all mb-2 ${
                mapFilters.timeFilter.type === "custom"
                  ? "bg-orange-500 text-white border-2 border-orange-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
              }`}
            >
              Custom Range
            </button>

            {mapFilters.timeFilter.type === "custom" && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={mapFilters.timeFilter.startDate || ""}
                    onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={mapFilters.timeFilter.endDate || ""}
                    onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
