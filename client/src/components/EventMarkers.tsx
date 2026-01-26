import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { categoryIcons, createCustomIcon } from "../icons";
import L from "leaflet";

function getIconSizeMultiplier(trendingScore?: number): number {
  if (!trendingScore) return 1.0;
  if (trendingScore <= 20) return 1.0;
  if (trendingScore <= 40) return 1.25;
  if (trendingScore <= 60) return 1.5;
  if (trendingScore <= 80) return 1.75;
  return 2.0;
}

const createEventClusterIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div style="background: #f97316; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${count}</div>`,
    className: "event-cluster-icon",
    iconSize: L.point(40, 40),
  });
};

function getTrendingColor(score: number): string {
  if (score > 60) return "#EF4444";
  if (score > 30) return "#FB923C";
  if (score > 0) return "#FCD34D";
  return "white";
}

export default function EventMarkers({
  events,
  onSelectSpot,
}: {
  events: any[];
  onSelectSpot: (item: any, type: "spot" | "event") => void;
}) {
  if (!events || events.length === 0) return null;

  return (
    <MarkerClusterGroup
      chunkedLoading
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      maxClusterRadius={60}
      iconCreateFunction={createEventClusterIcon}
    >
      {events.map((event: any) => {
        const cat = event.category || "default";
        const IconComponent = categoryIcons[cat] || categoryIcons.default;

        const trendingScore = event.trending_score || 0;
        const finalSize = 20 * getIconSizeMultiplier(trendingScore);
        const backgroundColor = getTrendingColor(trendingScore);
        const icon = createCustomIcon(IconComponent, backgroundColor, finalSize, { isEvent: true });

        return (
          <Marker
            key={`event-${event.id}`}
            position={[event.location[0], event.location[1]]}
            icon={icon}
            zIndexOffset={1000}
          >
            <Popup>
              <div
                onClick={() => onSelectSpot(event, "event")}
                className="cursor-pointer hover:bg-gray-50 -m-3 p-3 rounded"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-bold text-base">{event.name}</div>
                  <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
                    EVENT
                  </span>
                </div>
                {event.category && (
                  <div className="text-xs text-gray-600 capitalize mb-2">
                    {event.category}
                  </div>
                )}
                {event.description && (
                  <div className="text-sm text-gray-700 mb-2">
                    {event.description}
                  </div>
                )}
                {event.start_time && (
                  <div className="text-xs text-gray-500 mb-2">
                    {new Date(event.start_time).toLocaleDateString("en-GB")}{" "}
                    {new Date(event.start_time).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                {trendingScore > 0 && (
                  <div className="text-xs font-medium mb-1">
                    {trendingScore <= 30 && (
                      <span className="text-yellow-600">Trending</span>
                    )}
                    {trendingScore > 30 && trendingScore <= 60 && (
                      <span className="text-orange-600">Trending</span>
                    )}
                    {trendingScore > 60 && (
                      <span className="text-red-600">Very Trending</span>
                    )}
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
