import React, { useState } from "react";
import { FaShareAlt, FaTimes, FaSearch, FaFileAlt, FaFilePdf, FaFileWord } from "react-icons/fa";
import useTeamSharedReportViewModel from "../../model/TeamSharedReport";

export default function TeamSharedReport() {
    const {
        loading,
        error,
        myInspections,
        sharedInspections,
        showMyReportModal,
        setShowMyReportModal,
        showUserSelect,
        setShowUserSelect,
        selectedReport,
        filteredUsers,
        searchUser,
        setSearchUser,
        handleShareClick,
        handleShare
    } = useTeamSharedReportViewModel();

    if (loading && !showMyReportModal) return <div className="p-8 text-white">Loading shared reports...</div>;

    const downloadPDF = (item) => {
        if (item.pdfUrl) {
            window.open(item.pdfUrl, "_blank");
        } else {
            alert("No PDF report available.");
        }
    };

    const downloadDOCX = (item) => {
        if (item.wordUrl) {
            window.open(item.wordUrl, "_blank");
        } else {
            alert("No Word report available.");
        }
    };

    return (
        <div className="p-8 text-blue-100">
            <h1 className="text-3xl font-bold mb-6">Team Shared Report</h1>

            {/* Share My Report Button */}
            <button
                onClick={() => setShowMyReportModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold shadow-lg mr-4 flex items-center gap-2"
            >
                <FaShareAlt /> Share My Report
            </button>

            {/* View Shared Report */}
            <div className="mt-8 bg-gray-800 p-5 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold mb-3">Reports Shared With Me</h2>

                <div className="space-y-3">
                    {sharedInspections.map((item) => (
                        <div
                            key={item.id} // item is inspection object
                            className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <FaFileAlt className="text-blue-300 text-lg" />
                                <div>
                                    <p className="font-semibold text-blue-200">{item.ReportNo || item.title}</p>
                                    <p className="text-xs text-gray-400">
                                        Shared via Team
                                    </p>
                                </div>
                            </div>

                            {/* Download Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadPDF(item)}
                                    className={`px-3 py-1 rounded-lg text-white text-sm flex items-center gap-1 transition
                                        ${item.pdfUrl ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                                    disabled={!item.pdfUrl}
                                >
                                    <FaFilePdf /> PDF
                                </button>

                                <button
                                    onClick={() => downloadDOCX(item)}
                                    className={`px-3 py-1 rounded-lg text-white text-sm flex items-center gap-1 transition
                                        ${item.wordUrl ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                                    disabled={!item.wordUrl}
                                >
                                    <FaFileWord /> DOCX
                                </button>
                            </div>
                        </div>
                    ))}

                    {sharedInspections.length === 0 && (
                        <p className="text-gray-400">No shared reports found.</p>
                    )}
                </div>
            </div>

            {/* --- My Report Modal --- */}
            {showMyReportModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
                    <div className="bg-gray-800 w-full max-w-lg p-6 rounded-xl shadow-xl relative border border-gray-700">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowMyReportModal(false)}
                            className="absolute top-3 right-3 text-gray-300 hover:text-white"
                        >
                            <FaTimes size={20} />
                        </button>

                        <h2 className="text-2xl font-bold text-blue-100 mb-4">
                            My Reports
                        </h2>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {myInspections.length === 0 ? (
                                <p className="text-gray-400">You haven't created any inspections yet.</p>
                            ) : (
                                myInspections.map((r) => (
                                    <div
                                        key={r.InspectionID}
                                        className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaFileAlt className="text-blue-300 text-lg" />
                                            <div>
                                                <p className="text-blue-200 font-medium">{r.ReportNo}</p>
                                                <p className="text-xs text-gray-400">{r.ReportDate}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Share Button */}
                                            <button
                                                onClick={() => handleShareClick(r)}
                                                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-sm text-white flex items-center gap-1 transition"
                                            >
                                                <FaShareAlt /> Share
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- User Select Popup --- */}
            {showUserSelect && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                    <div className="bg-gray-800 w-full max-w-md p-6 rounded-xl shadow-xl relative border border-gray-700">
                        <button
                            onClick={() => setShowUserSelect(false)}
                            className="absolute top-3 right-3 text-gray-300 hover:text-white"
                        >
                            <FaTimes size={20} />
                        </button>

                        <h2 className="text-2xl font-bold text-blue-100 mb-4">
                            Share "{selectedReport?.ReportNo}"
                        </h2>

                        {/* Search */}
                        <div className="flex items-center bg-gray-700 p-2 rounded-lg mb-3 border border-gray-600">
                            <FaSearch className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                placeholder="Search user..."
                                value={searchUser}
                                onChange={(e) => setSearchUser(e.target.value)}
                                className="bg-transparent w-full text-blue-100 outline-none placeholder-gray-500"
                            />
                        </div>

                        {/* User List */}
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {filteredUsers.map((u) => (
                                <div
                                    key={u.UserID}
                                    className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded-lg hover:bg-gray-600 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Profile Photo */}
                                        {u.Photo ? (
                                            <img
                                                src={u.Photo}
                                                alt="Profile"
                                                className="w-10 h-10 rounded-full object-cover border border-gray-500"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                                                <span className="text-white font-bold">{u.FullName?.charAt(0)}</span>
                                            </div>
                                        )}

                                        <div className="flex flex-col">
                                            <span className="text-blue-100 font-medium">{u.FullName || "Unknown Inspector"}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-white text-sm shadow-sm"
                                        onClick={() => handleShare(u.UserID)}
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}

                            {filteredUsers.length === 0 && (
                                <p className="text-gray-400 text-sm p-2">No inspectors found matching "{searchUser}".</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
