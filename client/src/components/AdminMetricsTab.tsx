import React, { useEffect, useState } from "react";
import { Activity, Users, Clock, AlertTriangle, TrendingUp, Calendar, MapPin } from "lucide-react";
import { useAppSelector } from "../store/hooks";
import * as AdminApi from "../api/adminApi";

const SimpleBarChart = ({ data, colorClass, labelKey, valueKey }: any) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>;
  
  const maxVal = Math.max(...data.map((d: any) => Number(d[valueKey]) || 0));
  
  return (
    <div className="h-full w-full flex flex-col justify-start gap-3 py-2 pr-2 overflow-y-auto">
      {data.map((item: any, i: number) => {
        const val = Number(item[valueKey]) || 0;
        const percent = maxVal > 0 ? (val / maxVal) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-32 text-gray-600 truncate text-right font-medium" title={item[labelKey]}>
              {item[labelKey]}
            </div>
            <div className="flex-1 h-5 bg-gray-100 rounded-r-full overflow-hidden relative">
               <div 
                 className={`h-full ${colorClass} rounded-r-full transition-all duration-500`} 
                 style={{ width: `${Math.max(percent, 2)}%` }}
               />
            </div>
            <div className="w-8 text-xs font-bold text-gray-500 text-left">
               {val}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DetailedLineChart = ({ data, lines }: any) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">No data</div>;
  
  const height = 200;
  const width = 1000; // Virtual SVG width
  const paddingX = 40;
  const paddingY = 20;
  
  // Calc Max Y
  let maxVal = 0;
  lines.forEach((l: any) => {
     const m = Math.max(...data.map((d: any) => Number(d[l.key]) || 0));
     if(m > maxVal) maxVal = m;
  });
  // Add 10% headroom and ensure min height of 5
  maxVal = Math.max(maxVal * 1.1, 5); 

  const getPoints = (key: string) => {
    return data.map((d: any, i: number) => {
      const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
      const val = Number(d[key]) || 0;
      const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return `${x},${y}`;
    }).join(" ");
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      {/* Legend */}
      <div className="flex justify-end gap-4 mb-2 pr-4">
         {lines.map((l: any) => (
            <div key={l.key} className="flex items-center gap-1.5 text-xs">
               <div className="w-3 h-3 rounded-full" style={{background: l.color}}></div>
               <span className="text-gray-600 font-medium">{l.name}</span>
            </div>
         ))}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-[20px] w-[30px] flex flex-col justify-between text-[10px] text-gray-400 py-4 text-right pr-1">
           <span>{Math.round(maxVal)}</span>
           <span>{Math.round(maxVal/2)}</span>
           <span>0</span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full pl-[30px]">
          {/* Grid Lines */}
          <line x1="0" y1={paddingY} x2={width} y2={paddingY} stroke="#f0f0f0" strokeWidth="1" />
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#f0f0f0" strokeWidth="1" />
          <line x1="0" y1={height - paddingY} x2={width} y2={height - paddingY} stroke="#f0f0f0" strokeWidth="1" />

          {/* Data Lines */}
          {lines.map((line: any) => (
            <polyline 
              key={line.key}
              fill="none"
              stroke={line.color}
              strokeWidth="2"
              points={getPoints(line.key)}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>

      {/* X-Axis Labels (One per day) */}
      <div className="flex justify-between pl-[30px] text-[10px] text-gray-400 pt-1">
         {data.map((d: any, i: number) => (
            // Show label for every 3rd day to avoid clutter if many days
            (i % 3 === 0 || i === data.length - 1) ? (
                <div key={i} className="text-center w-8 -ml-4 whitespace-nowrap overflow-visible">
                    {d.date.slice(5).replace('-', '/')}
                </div>
            ) : <div key={i} className="w-1" />
         ))}
      </div>
    </div>
  );
};

const SimpleAreaChart = ({ data, labelKey, valueKey, color }: any) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">No data</div>;

  const maxVal = Math.max(...data.map((d: any) => Number(d[valueKey]) || 0), 1);
  const width = 100; 
  const height = 100;
  
  const points = data.map((d: any, i: number) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((Number(d[valueKey]) || 0) / maxVal) * 100;
    return `${x},${y}`;
  }).join(" ");

  const polygonPoints = `0,100 ${points} 100,100`;

  return (
    <div className="h-full w-full relative">
       <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
         <polygon points={polygonPoints} fill={`${color}20`} /> {/* 20 = low opacity hex */}
         <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
       </svg>
       {/* X-Axis: Show First, Middle, Last label */}
       <div className="absolute bottom-0 w-full flex justify-between text-[10px] text-gray-400 mt-1 px-1">
          <span>{data[0][labelKey]}</span>
          <span>{data[Math.floor(data.length/2)][labelKey]}</span>
          <span>{data[data.length-1][labelKey]}</span>
       </div>
    </div>
  );
};

// --- MAIN PAGE ---

export default function AdminMetricsTab() {
  const { token } = useAppSelector((state) => state.auth);
  const [activity, setActivity] = useState<any>(null);
  const [engagement, setEngagement] = useState<any>(null);
  const [reportTimes, setReportTimes] = useState<any>(null);
  const [flags, setFlags] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [actData, engData, repData, flagData] = await Promise.all([
          AdminApi.getMetricActivity(token),
          AdminApi.getMetricEngagement(token),
          AdminApi.getMetricReports(token),
          AdminApi.getMetricFlags(token),
        ]);
        setActivity(actData);
        setEngagement(engData);
        setReportTimes(repData);
        setFlags(flagData);
      } catch (err) {
        console.error("Failed to load metrics", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [token]);

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading analytics...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* ROW 1: MOST VIEWED (Spots & Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50">
            <Activity className="text-blue-600" size={20} />
            <h3 className="font-bold text-gray-800">Top 10 Viewed Spots (30 Days)</h3>
          </div>
          <div className="h-64">
            <SimpleBarChart 
              data={activity?.top_spots_views} 
              colorClass="bg-blue-500" 
              labelKey="name" 
              valueKey="views" 
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50">
            <TrendingUp className="text-purple-600" size={20} />
            <h3 className="font-bold text-gray-800">Top 10 Viewed Events (30 Days)</h3>
          </div>
          <div className="h-64">
             <SimpleBarChart 
               data={activity?.top_events_views} 
               colorClass="bg-purple-500" 
               labelKey="name" 
               valueKey="views" 
             />
          </div>
        </div>
      </div>

      {/* ROW 2: ENGAGEMENT TIMELINE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-green-600" size={20} />
          <h3 className="font-bold text-gray-800">Platform Engagement (Last 30 Days)</h3>
        </div>
        <div className="h-72 w-full">
           <DetailedLineChart 
             data={engagement?.daily_stats} 
             lines={[
                { key: 'logins', color: '#10b981', name: 'Logins' },
                { key: 'spots', color: '#3b82f6', name: 'New Spots' },
                { key: 'events', color: '#8b5cf6', name: 'New Events' },
                { key: 'reports', color: '#f97316', name: 'Reports' }
             ]}
           />
        </div>
      </div>

      {/* ROW 3: REPORTING PEAKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="text-orange-600" size={20} />
            <h3 className="font-bold text-gray-800">Peak Reporting Hours (Avg)</h3>
          </div>
          <div className="h-48 w-full px-2">
             <SimpleAreaChart 
                data={reportTimes?.hourly_heatmap} 
                labelKey="hour" 
                valueKey="count"
                color="#f97316"
             />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="text-pink-600" size={20} />
            <h3 className="font-bold text-gray-800">Peak Reporting Days</h3>
          </div>
          <div className="h-48 w-full px-2">
             <SimpleBarChart 
                data={reportTimes?.weekly_heatmap} 
                colorClass="bg-pink-500" 
                labelKey="day" 
                valueKey="count" 
             />
          </div>
        </div>
      </div>

      {/* ROW 4: FLAG ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Flagged Entities */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
            <AlertTriangle className="text-red-600" size={20} />
            <h3 className="font-bold text-gray-800">Most Flagged Content</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 h-64 overflow-y-auto">
             <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Spots</h4>
                <SimpleBarChart 
                  data={flags?.most_flagged_spots} 
                  colorClass="bg-red-500" 
                  labelKey="name" 
                  valueKey="count" 
                />
             </div>
             <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Events</h4>
                <SimpleBarChart 
                  data={flags?.most_flagged_events} 
                  colorClass="bg-orange-500" 
                  labelKey="name" 
                  valueKey="count" 
                />
             </div>
          </div>
        </div>

        {/* Users with most flags */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
            <ShieldCheck className="text-indigo-600" size={20} />
            <h3 className="font-bold text-gray-800">Users with Most Flagged Reports</h3>
          </div>
          <div className="h-64 overflow-y-auto">
            {flags?.problematic_users?.length === 0 ? (
               <div className="h-full flex items-center justify-center text-gray-400">No data</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="p-2 pl-4">User</th>
                    <th className="p-2 text-right pr-4">Flags Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t border-gray-100">
                  {flags?.problematic_users?.map((u: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 pl-4 font-medium text-gray-700">{u.name}</td>
                      <td className="p-2 text-right pr-4">
                        <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-xs">
                          {u.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// Icon component helper
function ShieldCheck({ size, className }: any) {
    return (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={className}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
    )
}