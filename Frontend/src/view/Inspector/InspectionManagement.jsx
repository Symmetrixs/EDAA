import React, { useState } from "react";
import { FaPlus, FaPen, FaTimes, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useInspectionManagementViewModel from "../../model/InspectionManagement";

// Components for Tabs
import InspectionPart1 from "./InspectionPart1";
import InspectionPart2 from "./InspectionPart2";
import InspectionPart3 from "./InspectionPart3";

export default function InspectionManagement() {
    const navigate = useNavigate();

    const {
        filteredInspections,
        searchTerm,
        setSearchTerm,
        editInspection, // actively selected inspection
        setEditInspection,
        handleUpdateInspection, // callback when update happens (reload list)
        loading,
        handleDelete
    } = useInspectionManagementViewModel();

    const [modalTab, setModalTab] = useState("part1");
    const [isAddMode, setIsAddMode] = useState(false);

    const openEditModal = (inspection) => {
        setEditInspection(inspection);
        setModalTab("part1");
        setIsAddMode(false);
    };

    const openAddModal = () => {
        setEditInspection(null);
        setModalTab("part1");
        setIsAddMode(true);
    };

    const closeEditModal = () => {
        setEditInspection(null);
        setIsAddMode(false);
    };

    return (
        <div className="p-8 text-blue-100">
            <h1 className="text-3xl font-bold mb-6">Inspection Management</h1>

            <div className="flex justify-between items-center mb-6">
                <input
                    type="text"
                    placeholder="Search by Report No or Status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800 text-blue-100 px-4 py-2 rounded-lg outline-none w-72 border border-gray-700 focus:border-blue-500 transition-colors"
                />
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg font-semibold text-white transition-transform active:scale-95"
                >
                    <FaPlus /> Add Inspection
                </button>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-left">
                    <thead className="bg-gray-900 text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Report No</th>
                            <th className="px-6 py-3">Equipment</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    Loading inspections...
                                </td>
                            </tr>
                        ) : filteredInspections.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    No inspections found.
                                </td>
                            </tr>
                        ) : (
                            filteredInspections.map((ins) => (
                                <tr key={ins.InspectionID} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-blue-200">{ins.ReportNo}</td>
                                    <td className="px-6 py-4 text-blue-300">{ins.Equipment?.EquipDescription || "N/A"}</td>
                                    <td className="px-6 py-4 text-gray-400">{ins.ReportDate}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${ins.Status === "Approved"
                                                ? "bg-green-900/60 text-green-300 border border-green-600"
                                                : ins.Status === "Completed"
                                                    ? "bg-blue-900/40 text-blue-400 border border-blue-800"
                                                    : ins.Status === "Pending"
                                                        ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800"
                                                        : "bg-gray-700 text-gray-300"
                                                } `}
                                        >
                                            {ins.Status || "Unknown"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button
                                            onClick={() => ins.Status !== "Approved" && openEditModal(ins)}
                                            disabled={ins.Status === "Approved"}
                                            title={ins.Status === "Approved" ? "Cannot edit approved inspections" : "Edit Inspection"}
                                            className={`flex items-center gap-1 transition-colors px-3 py-1.5 rounded border ${ins.Status === "Approved"
                                                ? "text-gray-500 bg-gray-800 border-gray-700 cursor-not-allowed opacity-50"
                                                : "text-blue-400 hover:text-white hover:bg-blue-600/20 bg-blue-900/20 border-blue-900/50"
                                                }`}
                                        >
                                            <FaPen size={12} /> Edit
                                        </button>
                                        <button
                                            onClick={() => ins.Status !== "Approved" && handleDelete(ins.InspectionID)}
                                            disabled={ins.Status === "Approved"}
                                            title={ins.Status === "Approved" ? "Cannot delete approved inspections" : "Delete Inspection"}
                                            className={`flex items-center gap-1 transition-colors px-3 py-1.5 rounded border ${ins.Status === "Approved"
                                                ? "text-gray-500 bg-gray-800 border-gray-700 cursor-not-allowed opacity-50"
                                                : "text-red-400 hover:text-white hover:bg-red-600/20 bg-red-900/20 border-red-900/50"
                                                }`}
                                        >
                                            <FaTrash size={12} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Tabbed Modal */}
            {
                (editInspection || isAddMode) && (
                    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-50 p-4">
                        <div className="bg-gray-900 w-full max-w-7xl h-[95vh] rounded-2xl flex flex-col shadow-2xl border border-gray-800">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 rounded-t-2xl">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        {isAddMode ? (
                                            "Create New Inspection"
                                        ) : (
                                            <>Edit Inspection: <span className="text-blue-400">{editInspection.ReportNo}</span></>
                                        )}
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-1">
                                        {isAddMode ? "Select equipment and upload photos" : (editInspection.Equipment?.EquipDescription || "No Description")}
                                    </p>
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                    <button
                                        onClick={() => setModalTab("part1")}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${modalTab === "part1"
                                            ? "bg-blue-600 text-white shadow"
                                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                                            }`}
                                    >
                                        Part 1: Photos
                                    </button>
                                    <button
                                        onClick={() => setModalTab("part2")}
                                        disabled={isAddMode}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${modalTab === "part2"
                                            ? "bg-blue-600 text-white shadow"
                                            : isAddMode ? "text-gray-600 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-gray-800"
                                            }`}
                                    >
                                        Part 2: Findings
                                    </button>
                                    <button
                                        onClick={() => setModalTab("part3")}
                                        disabled={isAddMode}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${modalTab === "part3"
                                            ? "bg-blue-600 text-white shadow"
                                            : isAddMode ? "text-gray-600 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-gray-800"
                                            }`}
                                    >
                                        Part 3: Final Report
                                    </button>
                                </div>

                                <button
                                    onClick={closeEditModal}
                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-hidden relative bg-gray-900">
                                <div className="absolute inset-0 overflow-y-auto">
                                    {modalTab === "part1" && (
                                        <InspectionPart1
                                            inspectionId={editInspection?.InspectionID}
                                            inspectionData={editInspection}
                                            isEmbedded={true}
                                            onCreated={async (newId) => {
                                                try {
                                                    // Fetch the newly created inspection details
                                                    const response = await api.get(`/inspection/${newId}`);
                                                    setEditInspection(response.data);
                                                    setIsAddMode(false); // Switch to Edit Mode
                                                    setModalTab("part2"); // Auto-advance to Findings
                                                } catch (error) {
                                                    console.error("Failed to load new inspection:", error);
                                                    alert(`Inspection created (ID: ${newId}), but failed to load details. Error: ${error.message}`);
                                                    closeEditModal();
                                                    window.location.reload();
                                                }
                                            }}
                                        />
                                    )}
                                    {modalTab === "part2" && !isAddMode && (
                                        <InspectionPart2
                                            inspectionId={editInspection.InspectionID}
                                        />
                                    )}
                                    {modalTab === "part3" && !isAddMode && (
                                        <InspectionPart3
                                            inspectionId={editInspection.InspectionID}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
