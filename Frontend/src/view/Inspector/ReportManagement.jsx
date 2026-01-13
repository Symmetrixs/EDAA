import React, { useState } from "react";
import {
    FaFileAlt,
    FaFilePdf,
    FaFileWord,
    FaEdit,
    FaEye,
    FaTimes,
    FaSync
} from "react-icons/fa";
import useReportManagementViewModel from "../../model/ReportManagement";

export default function ReportManagement() {
    const {
        reports,
        loading,
        error,
        selectedReport,
        previewOpen,
        setPreviewOpen,
        editOpen,
        setEditOpen,
        editComment,
        setEditComment,
        openPreview,
        openEdit,
        saveEdit,
        downloadPDF,
        downloadDOCX
    } = useReportManagementViewModel();

    const [searchTerm, setSearchTerm] = useState("");

    const filteredReports = reports.filter(r => {
        const term = searchTerm.toLowerCase();
        return (
            (r.title && r.title.toLowerCase().includes(term)) ||
            (r.equipmentDesc && r.equipmentDesc.toLowerCase().includes(term)) ||
            (r.date && r.date.toLowerCase().includes(term)) ||
            (r.status && r.status.toLowerCase().includes(term))
        );
    });

    if (loading) return <div className="p-8 text-white">Loading reports...</div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

    return (
        <div className="p-8 text-blue-100">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
                My Reports
            </h1>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <p className="text-gray-400 text-sm">
                    Generated reports from completed inspections.
                </p>

                {/* Search Bar */}
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-64"
                />
            </div>

            <div className="space-y-4">
                {filteredReports.map((r) => (
                    <div
                        key={r.id}
                        className="bg-gray-800 p-4 rounded-xl shadow-lg flex justify-between items-center"
                    >
                        {/* Left Section */}
                        <div className="flex items-center gap-4">
                            <FaFileAlt className="text-blue-300 text-2xl" />
                            <div>
                                <h3 className="text-blue-200 font-semibold text-lg flex items-center gap-3">
                                    {r.title}
                                    <span className={`text-xs px-2 py-0.5 rounded border 
                                        ${r.status === "Approved" ? "bg-green-900 text-green-300 border-green-600" :
                                            r.status === "Completed" ? "bg-blue-900 text-blue-300 border-blue-600" :
                                                "bg-yellow-900 text-yellow-300 border-yellow-600"}`}>
                                        {r.status}
                                    </span>
                                </h3>
                                <p className="text-gray-400 text-sm mt-1 italic">
                                    {r.equipmentDesc}
                                </p>
                            </div>
                        </div>

                        {/* Date Column (Hidden on mobile) */}
                        <div className="hidden md:block px-6 text-gray-400 text-sm whitespace-nowrap">
                            {r.date}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openPreview(r)}
                                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg text-white text-sm flex items-center gap-1 transition shadow-lg shadow-purple-900/20"
                                title="View Admin Comments"
                            >
                                <FaEye /> View Comment
                            </button>

                            <button
                                onClick={() => downloadPDF(r)}
                                className={`px-3 py-1 rounded-lg text-white text-sm flex items-center gap-1 transition
                                    ${r.pdfUrl ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                                disabled={!r.pdfUrl}
                            >
                                <FaFilePdf /> PDF
                            </button>

                            <button
                                onClick={() => downloadDOCX(r)}
                                className={`px-3 py-1 rounded-lg text-white text-sm flex items-center gap-1 transition
                                    ${r.wordUrl ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
                                disabled={!r.wordUrl}
                            >
                                <FaFileWord /> DOCX
                            </button>
                        </div>
                    </div>
                ))}

                {filteredReports.length === 0 && (
                    <div className="bg-gray-800 p-8 rounded-xl text-center border border-gray-700">
                        <p className="text-gray-400">No reports found.</p>
                    </div>
                )}
            </div>

            {/* ==================== PREVIEW MODAL ==================== */}
            {previewOpen && selectedReport && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
                    <div className="bg-gray-900 w-full max-w-2xl p-6 rounded-xl shadow-xl relative border border-gray-700">
                        <button
                            onClick={() => setPreviewOpen(false)}
                            className="absolute top-3 right-3 text-gray-300 hover:text-white"
                        >
                            <FaTimes size={22} />
                        </button>

                        <h2 className="text-2xl font-bold text-blue-200 mb-4 flex justify-between items-center">
                            <span>Comment for {selectedReport.title}</span>
                            <span className={`text-xs px-2 py-1 rounded border 
                                        ${selectedReport.status === "Approved" ? "bg-green-900 text-green-300 border-green-600" :
                                    selectedReport.status === "Completed" ? "bg-blue-900 text-blue-300 border-blue-600" :
                                        "bg-yellow-900 text-yellow-300 border-yellow-600"}`}>
                                {selectedReport.status}
                            </span>
                        </h2>

                        <p className="text-gray-300 whitespace-pre-wrap leading-6">
                            {selectedReport.content}
                        </p>
                    </div>
                </div>
            )}

            {/* ==================== EDIT MODAL ==================== */}
            {editOpen && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
                    <div className="bg-gray-900 w-full max-w-xl p-6 rounded-xl shadow-xl relative border border-gray-700">
                        <button
                            onClick={() => setEditOpen(false)}
                            className="absolute top-3 right-3 text-gray-300 hover:text-white"
                        >
                            <FaTimes size={22} />
                        </button>

                        <h2 className="text-2xl font-bold text-blue-200 mb-4">
                            Edit Report Comment
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-gray-300 text-sm">Comment / Notes</label>
                                <textarea
                                    className="w-full bg-gray-800 text-blue-100 p-3 mt-1 rounded-lg outline-none h-40 border border-gray-600 focus:border-blue-500"
                                    value={editComment}
                                    onChange={(e) => setEditComment(e.target.value)}
                                    placeholder="Add comments about this report..."
                                />
                            </div>
                        </div>

                        <button
                            onClick={saveEdit}
                            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold text-white transition shadow-lg"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
