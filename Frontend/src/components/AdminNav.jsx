import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/admin" },
  { label: "Users", to: "/admin/users" },
  { label: "Reports", to: "/admin/reports" },
  { label: "Vessels", to: "/admin/vessels" },
  { label: "Analytics", to: "/admin/analytics" },
];

export function AdminNav() {
  return (
    <div className="bg-white border-b">
      <div className="max-w-6xl mx-auto flex gap-6 px-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `py-3 text-sm font-medium border-b-2 ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
