import React from "react";
import { Link } from "react-router-dom";
import { FaUsers, FaFileAlt, FaClipboardList, FaChartBar, FaCog, FaBell, FaArrowRight } from "react-icons/fa";

import { useAdminAnalyticsViewModel } from "../../model/Admin-Analytics";

export function AdminDashboard() {
  const user = { name: "Admin" }; // Mock or get from Context if needed
  const { stats } = useAdminAnalyticsViewModel();

  const tiles = [
    { label: "User Management", icon: <FaUsers className="text-4xl text-purple-400" />, to: "/admin/users", desc: "Manage system users and inspectors.", color: "border-purple-500/30 hover:border-purple-500" },
    { label: "Reports", icon: <FaFileAlt className="text-4xl text-green-400" />, to: "/admin/reports", desc: "View and manage all inspection reports.", color: "border-green-500/30 hover:border-green-500" },
    { label: "Vessels", icon: <FaClipboardList className="text-4xl text-blue-400" />, to: "/admin/vessels", desc: "Maintain the vessel database.", color: "border-blue-500/30 hover:border-blue-500" },
    { label: "Analytics", icon: <FaChartBar className="text-4xl text-pink-400" />, to: "/admin/analytics", desc: "System-wide performance metrics.", color: "border-pink-500/30 hover:border-pink-500" },
  ];

  return (
    <div className="p-8 text-blue-100 min-h-full">
      {/* Welcome Section */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-400 text-lg">
          Overview of system activity and management modules.
        </p>
      </header>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiles.map((t, idx) => (
          <Link
            key={idx}
            to={t.to}
            className={`group bg-gray-800 rounded-2xl p-8 border ${t.color} transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between`}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-gray-900 rounded-xl shadow-inner">
                  {t.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                  <FaArrowRight className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats (Real Data) - Styled for Dark Theme */}
      <div className="mt-10 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
          System Overview
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-yellow-500/50 transition">
            <div className="text-2xl font-bold text-white">{stats.pendingReports}</div>
            <div className="text-xs text-gray-400 mt-1">Pending reports</div>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-purple-500/50 transition">
            <div className="text-2xl font-bold text-white">{stats.activeInspectors}</div>
            <div className="text-xs text-gray-400 mt-1">Active inspectors</div>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-green-500/50 transition">
            <div className="text-2xl font-bold text-white">{stats.completedReports}</div>
            <div className="text-xs text-gray-400 mt-1">Total Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
