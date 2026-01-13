import React, { useState } from "react";
import { FaSearch, FaImage, FaEdit, FaPlus, FaTrash, FaTimes, FaCalendarAlt, FaIndustry, FaTag } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useVesselViewModel } from '../../model/Vessel';

export default function VesselManagement() {
    const navigate = useNavigate();
    const {
        filteredVessels,
        loading,
        error,
        searchQuery, setSearchQuery,
        handleDelete
    } = useVesselViewModel();

    // Local UI State for Modal
    const [selectedVessel, setSelectedVessel] = useState(null);

    if (loading) return <div className="p-8 text-blue-100">Loading equipment...</div>;
    if (error) return <div className="p-8 text-red-400">{error}</div>;

    return (
        <div className="p-8 text-blue-100 relative">
            <h1 className="text-3xl font-bold mb-6">Vessel Management</h1>

            {/* Top Section */}
            <div className="flex justify-between mb-6">
                {/* Search Bar */}
                <div className="flex items-center bg-gray-800 px-3 py-2 rounded-lg w-72">
                    <FaSearch className="text-gray-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search equipment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-blue-100 outline-none w-full"
                    />
                </div>

                {/* Navigate to AddEquipment page */}
                <button
                    onClick={() => navigate("/dashboard/vesselmanagement/add")}
                    className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg text-white font-semibold flex items-center gap-2"
                >
                    <FaPlus />
                    New Equipment
                </button>
            </div>

            {/* Equipment List */}
            <div className="space-y-4">
                {filteredVessels.map((eq) => (
                    <div
                        key={eq.EquipID}
                        onClick={() => setSelectedVessel(eq)}
                        className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                        {/* PHOTO LEFT */}
                        <div className="flex items-center gap-4">
                            {eq.Photo ? (
                                <img
                                    src={eq.Photo}
                                    alt="Equipment"
                                    className="h-14 w-14 rounded-lg object-cover border border-gray-600"
                                />
                            ) : (
                                <div className="h-14 w-14 flex items-center justify-center bg-gray-700 rounded-lg border border-gray-600">
                                    <FaImage className="text-gray-500 text-xl" />
                                </div>
                            )}

                            <div>
                                <p className="text-blue-200 font-semibold text-lg">{eq.EquipDescription}</p>
                                <p className="text-gray-400 text-sm">
                                    {eq.EquipType} • {eq.TagNo} • {eq.PlantName}
                                </p>
                            </div>
                        </div>

                        {/* ACTIONS RIGHT */}
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/dashboard/vesselmanagement/edit", { state: { equipment: eq } });
                                }}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold"
                            >
                                <FaEdit />
                                Edit
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(eq.EquipID);
                                }}
                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-white font-semibold"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredVessels.length === 0 && (
                    <p className="text-gray-400">No equipment found.</p>
                )}
            </div>

            {/* --- DETAILS MODAL --- */}
            {selectedVessel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-fadeIn">

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedVessel(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full z-10"
                        >
                            <FaTimes />
                        </button>

                        {/* Modal Header Image */}
                        <div className="h-64 bg-gray-800 w-full relative">
                            {selectedVessel.Photo ? (
                                <img
                                    src={selectedVessel.Photo}
                                    alt="Equipment"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                                    <FaImage className="text-6xl mb-2" />
                                    <span>No Image Available</span>
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 to-transparent h-24"></div>
                            <div className="absolute bottom-4 left-6">
                                <h2 className="text-3xl font-bold text-white drop-shadow-md">
                                    {selectedVessel.EquipDescription}
                                </h2>
                                <p className="text-blue-300 font-medium">
                                    {selectedVessel.EquipType}
                                </p>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <FaTag className="text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Tag No</p>
                                            <p className="font-semibold">{selectedVessel.TagNo || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <FaIndustry className="text-blue-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Plant Name</p>
                                            <p className="font-semibold">{selectedVessel.PlantName || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <div className="w-4 flex justify-center text-blue-500 font-bold">D</div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">DOSH No</p>
                                            <p className="font-semibold">{selectedVessel.DOSH || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="bg-gray-800/50 p-4 rounded-xl space-y-4 border border-gray-700">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <FaCalendarAlt className="text-green-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Last Inspection</p>
                                            <p className="font-semibold">{selectedVessel.Last_Inspection_Date || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <FaCalendarAlt className="text-orange-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Next Inspection</p>
                                            <p className="font-semibold">{selectedVessel.Next_Inspection_Date || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
