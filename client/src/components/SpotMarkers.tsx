import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { categoryIcons, categoryColors, createCustomIcon, getIconSizeMultiplier } from "../icons";
import { Spot } from "../generated-types";

export default function SpotMarkers({
  spots,
  onSelectSpot,
}: {
  spots: Spot[];
  onSelectSpot: (spot: any, type: "spot" | "event") => void;
}) {
  if (!spots || spots.length === 0) return null;

  return (
    <MarkerClusterGroup
      chunkedLoading
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      maxClusterRadius={60}
    >
      {spots.map((spot) => {
        const cat = spot.category || "default";
        const IconComponent = categoryIcons[cat] || categoryIcons.default;
        const iconColor = categoryColors[cat] || categoryColors.default;

        const trendingScore = (spot as any).trending_score || 0;
        const finalSize = 20 * getIconSizeMultiplier(trendingScore);
        const icon = createCustomIcon(IconComponent, iconColor, finalSize);

        return (
          <Marker
            key={`spot-${spot.id}`}
            position={[spot.location[0], spot.location[1]]}
            icon={icon}
          >
            <Popup>
              <div
                onClick={() => onSelectSpot(spot, "spot")}
                className="cursor-pointer hover:bg-gray-50 -m-3 p-3 rounded"
              >
                <div className="font-bold text-base mb-1">{spot.name}</div>
                {spot.category && (
                  <div className="text-xs text-gray-600 capitalize mb-2">
                    {spot.category}
                  </div>
                )}
                {spot.description && (
                  <div className="text-sm text-gray-700 mb-2">
                    {spot.description}
                  </div>
                )}
                {trendingScore > 0 && (
                  <div className="text-xs text-blue-600 font-medium">
                    Trending
                  </div>
                )}
                <div className="text-xs text-blue-600 font-medium mt-2">
                  Click to view details
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}
