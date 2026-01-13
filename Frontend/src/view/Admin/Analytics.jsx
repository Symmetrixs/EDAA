import React from "react";
import { FaChartLine, FaCheckCircle, FaUsers } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAdminAnalyticsViewModel } from "../../model/Admin-Analytics";

const DEFECT_COLORS = {
  corrosion: "#d97706",         // RustOrange
  dents: "#0a8110ff",             // Gray/Blue
  scratch_mark: "#7c3aed",      // Purple
  welding_defects: "#f1ff2eff"  // Yellow
};

export function Analytics() {
  const { stats, equipmentStats, loading, error, year, setYear } = useAdminAnalyticsViewModel();

  if (loading && !stats) return <div className="p-8 text-white">Loading stats...</div>; // Only block if no stats at all

  return (
    <div className="p-8 text-blue-100 min-h-full">
      <h1 className="text-3xl font-bold mb-8 text-white">Analytics</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded mb-6 text-red-200">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/40 rounded-full text-blue-400">
              <FaChartLine className="text-xl" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.totalInspections}</div>
              <div className="text-sm text-gray-400">Total Inspections</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-900/40 rounded-full text-green-400">
              <FaCheckCircle className="text-xl" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.completedReports}</div>
              <div className="text-sm text-gray-400">Total Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-900/40 rounded-full text-yellow-400">
              <FaCheckCircle className="text-xl" />
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{stats.pendingReports}</div>
              <div className="text-sm text-gray-400">Pending Reports</div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Defect Analysis by Equipment</h2>

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Filter Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              {/* Generate years dynamically: Current Year down to 2023 */}
              {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i + 1).reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={equipmentStats}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
              />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ paddingLeft: "20px" }} />

              {/* Defect Type Bars (Stacked) */}
              <Bar dataKey="corrosion" name="Corrosion" stackId="a" fill={DEFECT_COLORS.corrosion} />
              <Bar dataKey="dents" name="Dents" stackId="a" fill={DEFECT_COLORS.dents} />
              <Bar dataKey="scratch_mark" name="Scratch Mark" stackId="a" fill={DEFECT_COLORS.scratch_mark} />
              <Bar dataKey="welding_defects" name="Welding Defect" stackId="a" fill={DEFECT_COLORS.welding_defects} />

            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
