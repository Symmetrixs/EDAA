import React from "react";
import { FaBell } from "react-icons/fa";

export function Notifications() {
  return (
    <div className="p-8 text-blue-100 min-h-full">
      <h1 className="text-3xl font-bold mb-8 text-white">Notifications</h1>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 space-y-4">
        <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-2">Recent Alerts</h3>

        <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <FaBell className="text-blue-400 mt-1" />
          <div>
            <p className="text-white font-medium">New inspection submitted</p>
            <p className="text-xs text-gray-500">2 minutes ago</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <FaBell className="text-purple-400 mt-1" />
          <div>
            <p className="text-white font-medium">User Inspector A added</p>
            <p className="text-xs text-gray-500">1 hour ago</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
          <FaBell className="text-yellow-400 mt-1" />
          <div>
            <p className="text-white font-medium">Report RPT002 pending review</p>
            <p className="text-xs text-gray-500">5 hours ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
