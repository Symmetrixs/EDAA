import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotificationViewModel } from "../../model/Notification"; // Import VM
import { useProfileViewModel } from "../../model/Profile";
import {
  FaTools,
  FaClipboardCheck,
  FaFileAlt,
  FaUsers,
  FaChartBar,
  FaUserCircle,
  FaSignOutAlt,
  FaHome,
  FaBell,
  FaBars,
  FaSketch,
  FaBuilding,
} from "react-icons/fa";

import { NotificationPopup } from "../../components/NotificationPopup";

export function Menu({ onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const { photo: profilePhoto } = useProfileViewModel();


  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    deleteNotification
  } = useNotificationViewModel();

  const userName = user?.name || "User";
  const userEmail = user?.email || "No Email";
  const userRole = user?.role || "Guest";

  const inspectorItems = [
    { label: "Home", path: "/dashboard", icon: <FaHome /> },
    { label: "Vessel Management", path: "/dashboard/vesselmanagement", icon: <FaBuilding /> },
    { label: "Inspection Management", path: "/dashboard/inspection", icon: <FaClipboardCheck /> },
    { label: "Report Management", path: "/dashboard/reportmanagement", icon: <FaFileAlt /> },
    { label: "Team Shared File", path: "/dashboard/teamsharedreport", icon: <FaUsers /> },
    { label: "Statistic Analysis", path: "/dashboard/statistics", icon: <FaChartBar /> },
    { label: "Settings", path: "/dashboard/settings", icon: <FaTools /> },
  ];

  const adminItems = [
    { label: "Dashboard", path: "/admin", icon: <FaHome /> },
    { label: "User Management", path: "/admin/users", icon: <FaUsers /> },
    { label: "Vessel Database", path: "/admin/vessels", icon: <FaClipboardCheck /> },
    { label: "All Reports", path: "/admin/reports", icon: <FaFileAlt /> },
    { label: "Analytics", path: "/admin/analytics", icon: <FaChartBar /> },
  ];

  const menuItems = userRole === "admin" ? adminItems : inspectorItems;

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <aside className="w-80 min-h-screen bg-gray-900 text-white p-5 flex flex-col shadow-2xl transition-all duration-300">

      {/* --- TOP HEADER SECTION --- */}
      <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-4">

        {/* LEFT: Profile Icon + Info */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/dashboard/profile")}
          title="View Profile"
        >
          {profilePhoto || user?.photo ? (
            <img
              src={profilePhoto || user?.photo}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-400"
            />
          ) : (
            <FaUserCircle className="text-4xl text-blue-400" />
          )}
          <div className="leading-tight">
            <span className="block font-semibold text-blue-100 text-sm">{userName}</span>
            <span
              className="block text-xs text-gray-400 truncate max-w-[120px]"
              title={userEmail}
            >
              {userEmail}
            </span>
          </div>
        </div>


        {/* RIGHT: Close Button */}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded transition"
          title="Close Menu"
        >
          <FaBars className="text-xl" />
        </button>

      </div>

      {/* --- LINKS SECTION --- */}
      <div className="flex flex-col gap-2 flex-grow">

        {/* Header Row: Title + Bell Icon */}
        <div className="flex justify-between items-center px-1 mb-2">
          <h2 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
            {userRole} Menu
          </h2>

          {/* Notification Bell */}
          <div
            onClick={() => setShowNotifications(true)}
            className="relative p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer transition"
            title="Notifications"
          >
            <FaBell className="text-md" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-gray-900 flex items-center justify-center text-[8px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Menu Items */}
        {menuItems.map((item, i) => (
          <div
            key={i}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-4 px-4 py-3 rounded-lg 
                       bg-gray-800/50 hover:bg-blue-600 cursor-pointer 
                       transition-colors duration-200 shadow-sm hover:shadow-md group"
          >
            <div className="text-lg text-blue-400 group-hover:text-white transition-colors">
              {item.icon}
            </div>

            {/* UPDATED FONT: changed from font-medium to font-normal */}
            <span className="font-normal text-gray-300 group-hover:text-white text-sm">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-lg 
                   bg-red-600 hover:bg-red-700 text-white font-semibold 
                   transition shadow-lg"
      >
        <FaSignOutAlt className="text-lg" />
        Logout
      </button>

      {/* Notification Popup Modal */}
      {showNotifications && (
        <NotificationPopup
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          loading={loading}
          markAsRead={markAsRead}
          deleteNotification={deleteNotification}
        />
      )}
    </aside>
  );
}