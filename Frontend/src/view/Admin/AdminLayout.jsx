import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu } from "../Inspector/Menu"; // Reuse the shared Menu component
import { FaBars } from "react-icons/fa";
import CompanyLogo from "../../assets/company-logo.png";

export default function AdminLayout() {
    const navigate = useNavigate();
    // State to manage sidebar visibility
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen flex bg-gray-700">

            {/* 1. LEFT SIDEBAR (Conditionally Rendered) */}
            {isSidebarOpen && (
                <Menu onClose={() => setIsSidebarOpen(false)} />
            )}

            {/* 2. RIGHT CONTENT AREA */}
            <div className="flex-1 flex flex-col transition-all duration-300">

                {/* Top Header */}
                <nav className="p-4 flex justify-between items-center bg-gray-900 shadow-md border-b border-gray-800">

                    <div className="flex items-center gap-4">

                        {/* Show "Open Menu" button only if sidebar is CLOSED */}
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="text-white hover:bg-gray-800 p-2 rounded transition"
                                title="Open Menu"
                            >
                                <FaBars className="text-xl" />
                            </button>
                        )}

                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <img src={CompanyLogo} alt="Company Logo" className="h-14 w-auto" />
                        </div>
                    </div>

                </nav>

                {/* Page Content */}
                {/* Added standard styling wrapper for consistency with Inspector */}
                <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
                    <Outlet />
                </div>

            </div>
        </div>
    );
}
