import React from "react";

export function Settings() {
  return (
    <div className="p-8 text-blue-100 min-h-full">
      <h1 className="text-3xl font-bold mb-8 text-white">System Settings</h1>

      <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 max-w-2xl">
        <div className="space-y-6">

          <div>
            <label className="block text-gray-400 mb-2 font-medium">System Name</label>
            <input
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition"
              value="Automated Inspection System"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Global name visible to all users.</p>
          </div>

          <div>
            <label className="block text-gray-400 mb-2 font-medium">Maintenance Mode</label>
            <select className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition">
              <option>Disabled</option>
              <option>Enabled</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Prevent non-admin users from accessing the system.</p>
          </div>

          <div className="pt-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
