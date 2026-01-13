import React from "react";
import { FaTimes, FaBell, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

export function NotificationPopup({ onClose, notifications, loading, markAsRead, deleteNotification }) {

    const getIcon = (type) => {
        switch (type) {
            case "success": return <FaCheckCircle className="text-green-500" />;
            case "warning": return <FaExclamationTriangle className="text-yellow-500" />;
            case "error": return <FaExclamationTriangle className="text-red-500" />;
            default: return <FaInfoCircle className="text-blue-500" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end animate-fadeIn">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            {/* Sidebar / Drawer for Notifications */}
            <div className="relative bg-gray-900 w-80 h-full shadow-2xl p-6 border-l border-gray-700 transform transition-transform duration-300 ease-in-out">
                <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaBell className="text-yellow-400" /> Notifications
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="space-y-4 overflow-y-auto h-[calc(100vh-120px)] pr-2">
                    {loading && <p className="text-center text-gray-500">Loading...</p>}

                    {!loading && notifications && notifications.map((n) => (
                        <div
                            key={n.NotificationID}
                            className={`p-4 rounded-lg flex items-start gap-3 transition-colors relative group cursor-pointer
                    ${n.IsRead ? 'bg-gray-800' : 'bg-gray-750 border-l-4 border-blue-500 hover:bg-gray-750'}
                `}
                            onClick={() => !n.IsRead && markAsRead(n.NotificationID)}
                        >
                            <div className="mt-1 text-lg">
                                {getIcon(n.Type)}
                            </div>
                            <div className="flex-1">
                                <p className={`text-gray-200 text-sm leading-snug ${n.IsRead ? '' : 'font-semibold'}`}>
                                    {n.Message}
                                </p>
                                <span className="text-xs text-gray-500 mt-1 block">
                                    {new Date(n.CreatedAt).toLocaleString()}
                                </span>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); deleteNotification(n.NotificationID); }}
                                className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-gray-500 hover:text-red-400"
                                title="Delete"
                            >
                                <FaTimes size={12} />
                            </button>
                        </div>
                    ))}

                    {!loading && (!notifications || notifications.length === 0) && (
                        <p className="text-center text-gray-500 mt-10">No notifications</p>
                    )}
                </div>
            </div>
        </div>
    );
}
