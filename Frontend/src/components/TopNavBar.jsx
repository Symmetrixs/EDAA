import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export function TopNavbar({ title }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Get user and logout function

  const handleLogout = () => {
    logout(); // Clear context
    navigate("/");
  };

  return (
    <nav className="w-full bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow">
      {/* Left */}
      <div className="text-lg font-semibold tracking-wide">
        Automated Inspection System
      </div>

      {/* Center */}
      <div className="text-sm md:text-base text-slate-200">
        {title}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-200">
          {user?.photo ? (
            <img
              src={user.photo}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-slate-600"
            />
          ) : (
            <FaUserCircle size={18} />
          )}
          <span className="text-sm">{user?.name || "User"}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 transition"
        >
          <FaSignOutAlt size={14} />
          Logout
        </button>
      </div>
    </nav>
  );
}
