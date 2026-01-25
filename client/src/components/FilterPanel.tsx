import { X, Calendar, CircleDot, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import { useDispatch } from "react-redux";
import { setShowFilterPanel, setMapFilters, setOnChooseDistanceLocation } from "../state/AppSlice";
import { categoryIcons } from "../icons";
import { useState, useRef, useEffect } from "react";

export default function FilterPanel() {
  const dispatch = useDispatch();
  const mapFilters = useAppSelector((state) => state.app.mapFilters);
  const currentUserLocation = useAppSelector((state) => state.app.currentUserLocation);
  const [filterType, setFilterType] = useState<"spots" | "events">("events");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const [isDistanceFilterOpen, setIsDistanceFilterOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Available categories for spots (excluding 'event' and 'default')
  const categories = [...Object.keys(categoryIcons).filter(
    (cat) => cat !== "event" && cat !== "default"
  ), "other"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside the panel AND not on a filter toggle button
      if (
        panelRef.current && 
        !panelRef.current.contains(target) &&
        !target.closest('[data-filter-toggle]')
      ) {
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
      distanceFilter: { enabled: false, fromLocation: "", customLocation: null, radius: 0.2 }
    }));
  };

  const handleTimeFilterChange = (type: "all" | "today" | "tomorrow" | "weekend" | "active" | "custom") => {
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
    mapFilters.timeFilter.type !== "all" ||
    mapFilters.distanceFilter.enabled;

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
                ? "bg-white text-blue-600 border-2 border-blue-500 shadow-sm"
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
                ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
            }`}
          >
            <Calendar size={14} />
            EVENTS ({mapFilters.eventCategories.length} selected)
          </button>
        </div>

        {/* Category Filter Section */}
        <div className="border-t pt-3 mt-3">
          <button
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <h4 className="text-xs font-semibold text-gray-700">Category Filter</h4>
            {isCategoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Categories Grid */}
          {isCategoryOpen && (
            <div 
              className={`grid grid-cols-3 gap-2 p-3 rounded-lg border-2 ${
                filterType === "spots" 
                  ? "border-blue-500 bg-blue-50/30" 
                  : "border-orange-500 bg-orange-50/30"
              }`}
            >
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
          )}
        </div>

        {/* Time Filter for Events */}
        {filterType === "events" && (
          <div className="border-t pt-3 mt-3">
            <button
              onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
              className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              <h4 className="text-xs font-semibold text-gray-700">Time Filter</h4>
              {isTimeFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isTimeFilterOpen && (
              <>
                {/* Time Filter Buttons - All Time, Active, Today, Tomorrow, Weekend */}
                <div className="grid grid-cols-5 gap-1 mb-2">
                  <button
                    onClick={() => handleTimeFilterChange("all")}
                    className={`py-1.5 px-0.5 rounded-lg text-[11px] font-medium transition-all ${
                      mapFilters.timeFilter.type === "all"
                        ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => handleTimeFilterChange("active")}
                    className={`py-1.5 px-0.5 rounded-lg text-[11px] font-medium transition-all ${
                      mapFilters.timeFilter.type === "active"
                        ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => handleTimeFilterChange("today")}
                    className={`py-1.5 px-0.5 rounded-lg text-[11px] font-medium transition-all ${
                      mapFilters.timeFilter.type === "today"
                        ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleTimeFilterChange("tomorrow")}
                    className={`py-1.5 px-0.5 rounded-lg text-[11px] font-medium transition-all ${
                      mapFilters.timeFilter.type === "tomorrow"
                        ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => handleTimeFilterChange("weekend")}
                    className={`py-1.5 px-0.5 rounded-lg text-[11px] font-medium transition-all ${
                      mapFilters.timeFilter.type === "weekend"
                        ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
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
                      ? "bg-white text-orange-600 border-2 border-orange-500 shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200"
                  }`}
                >
                  Custom Range
                </button>

                {mapFilters.timeFilter.type === "custom" && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        value={mapFilters.timeFilter.startDate || ""}
                        onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={mapFilters.timeFilter.endDate || ""}
                        onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}              </>
            )}
          </div>
        )}

        {/* Distance Filter */}
        <div className="border-t pt-3 mt-3">
          <button
            onClick={() => setIsDistanceFilterOpen(!isDistanceFilterOpen)}
            className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <h4 className="text-xs font-semibold text-gray-700">Distance Filter</h4>
            {isDistanceFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isDistanceFilterOpen && (
            <>
              {/* Enable/Disable Toggle */}
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapFilters.distanceFilter.enabled}
                  onChange={(e) => {
                    dispatch(setMapFilters({
                      ...mapFilters,
                      distanceFilter: {
                        ...mapFilters.distanceFilter,
                        enabled: e.target.checked
                      }
                    }));
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-700 font-medium">Enable Distance Filter</span>
              </label>

              {mapFilters.distanceFilter.enabled && (
                <>
                  {/* Location Source - All in one line */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs font-medium text-gray-700 whitespace-nowrap">From</label>
                      <button
                        onClick={() => {
                          dispatch(setMapFilters({
                            ...mapFilters,
                            distanceFilter: {
                              ...mapFilters.distanceFilter,
                              fromLocation: "current"
                            }
                          }));
                        }}
                        className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          mapFilters.distanceFilter.fromLocation === "current"
                            ? "bg-white text-blue-600 border-2 border-blue-500 shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                        }`}
                      >
                        <MapPin size={12} />
                        My Location
                      </button>
                      <button
                        onClick={() => {
                          dispatch(setMapFilters({
                            ...mapFilters,
                            distanceFilter: {
                              ...mapFilters.distanceFilter,
                              fromLocation: "custom"
                            }
                          }));
                          dispatch(setOnChooseDistanceLocation(true));
                        }}
                        className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all whitespace-nowrap ${
                          mapFilters.distanceFilter.fromLocation === "custom"
                            ? "bg-white text-blue-600 border-2 border-blue-500 shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                        }`}
                      >
                        Choose on Map
                      </button>
                      {(mapFilters.distanceFilter.fromLocation === "current" || mapFilters.distanceFilter.customLocation) && (
                        <button
                          onClick={() => {
                            dispatch(setMapFilters({
                              ...mapFilters,
                              distanceFilter: {
                                ...mapFilters.distanceFilter,
                                fromLocation: "",
                                customLocation: null
                              }
                            }));
                          }}
                          className="py-1 px-2 rounded text-xs text-orange-600 hover:text-orange-700 font-medium border border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 transition-all whitespace-nowrap"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {mapFilters.distanceFilter.fromLocation === "custom" && !mapFilters.distanceFilter.customLocation && (
                      <div className="text-xs text-orange-600">
                        Click on map to select location
                      </div>
                    )}
                    {mapFilters.distanceFilter.fromLocation === "current" && !currentUserLocation && (
                      <div className="text-xs text-orange-600">
                        Location not available
                      </div>
                    )}
                  </div>

                  {/* Distance Slider */}
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1 text-center">
                      Radius: {mapFilters.distanceFilter.radius.toFixed(1)} km
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={mapFilters.distanceFilter.radius}
                      onChange={(e) => {
                        dispatch(setMapFilters({
                          ...mapFilters,
                          distanceFilter: {
                            ...mapFilters.distanceFilter,
                            radius: parseFloat(e.target.value)
                          }
                        }));
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0 km</span>
                      <span>1 km</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
