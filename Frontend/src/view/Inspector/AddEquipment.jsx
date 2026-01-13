import React from "react";
import { FaTimes, FaUpload } from "react-icons/fa";
import { useAddEquipmentViewModel } from '../../model/AddEquipment';

export default function AddEquipment() {

    const {
        // Data
        equipDescription, setEquipDescription,
        type, setType,
        tagNo, setTagNo,
        plantName, setPlantName,
        dosh, setDosh,
        photo, setPhoto,

        // UI State
        loading,
        error,
        fileInputRef,
        onClose,

        // Actions
        handlePhotoChange,
        handleAdd
    } = useAddEquipmentViewModel();

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 animate-fadeIn">
            <div className="bg-gray-900 w-full max-w-xl p-6 rounded-xl shadow-xl relative text-blue-100">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
                >
                    <FaTimes size={22} />
                </button>

                <h2 className="text-2xl font-bold text-blue-200 mb-5 text-center">
                    Add New Equipment
                </h2>

                {error && <p className="text-red-400 text-center text-sm mb-4">{error}</p>}

                {/* Photo Upload Icon */}
                <div className="flex flex-col items-center mb-4">
                    <div
                        onClick={() => fileInputRef.current.click()}
                        className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-500 hover:border-blue-500 transition-colors"
                        title="Click to upload photo"
                    >
                        {photo ? (
                            <img
                                src={photo}
                                alt="Equipment"
                                className="h-24 w-24 object-cover rounded-lg"
                            />
                        ) : (
                            <FaUpload className="text-gray-400 text-3xl" />
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                    />
                    <span className="text-gray-400 text-sm mt-2">Upload Equipment Photo</span>
                </div>

                {/* Form Fields */}
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">

                    <div>
                        <label className="text-gray-300 text-sm font-medium">Equipment Description <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={equipDescription}
                            onChange={(e) => setEquipDescription(e.target.value)}
                            placeholder="e.g. Main Reactor Vessel"
                            className="w-full bg-gray-800 text-blue-100 mt-1 p-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                        />
                    </div>

                    {/* Equipment Type Dropdown */}
                    <div>
                        <label className="text-gray-300 text-sm font-medium">Equipment Type <span className="text-red-500">*</span></label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-gray-800 text-blue-100 mt-1 p-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                        >
                            <option value="Column, Tower">Column, Tower</option>
                            <option value="Reactor">Reactor</option>
                            <option value="Condenser">Condenser</option>
                            <option value="Bullet">Bullet</option>
                            <option value="Sphere">Sphere</option>
                            <option value="Accumulator">Accumulator</option>
                            <option value="Heat Exchanger">Heat Exchanger</option>
                            <option value="Separator">Separator</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-gray-300 text-sm font-medium">Tag No <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={tagNo}
                            onChange={(e) => setTagNo(e.target.value)}
                            placeholder="e.g. V-101"
                            className="w-full bg-gray-800 text-blue-100 mt-1 p-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                        />
                    </div>

                    <div>
                        <label className="text-gray-300 text-sm font-medium">Plant Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={plantName}
                            onChange={(e) => setPlantName(e.target.value)}
                            placeholder="e.g. Plant A - Olefins"
                            className="w-full bg-gray-800 text-blue-100 mt-1 p-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                        />
                    </div>

                    <div>
                        <label className="text-gray-300 text-sm font-medium">DOSH Registration No</label>
                        <input
                            type="text"
                            value={dosh}
                            onChange={(e) => setDosh(e.target.value)}
                            placeholder="e.g. PMT-12345"
                            className="w-full bg-gray-800 text-blue-100 mt-1 p-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleAdd}
                    disabled={loading}
                    className={`mt-6 w-full py-3 rounded-lg font-semibold text-white transition-colors shadow-lg
                        ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                    `}
                >
                    {loading ? "Adding..." : "Add Equipment"}
                </button>
            </div>
        </div>
    );
}
