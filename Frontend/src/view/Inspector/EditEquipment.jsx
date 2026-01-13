import React from "react";
import { FaTimes, FaUpload, FaPen, FaCheck } from "react-icons/fa";
import { useEditEquipmentViewModel } from '../../model/EditEquipment';

export default function EditEquipment() {
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
        onClose, // Navigate back

        // Toggles
        editDescription, setEditDescription,
        editType, setEditType,
        editTagNo, setEditTagNo,
        editPlant, setEditPlant,
        editDosh, setEditDosh,
        editPhoto, setEditPhoto,

        // Actions
        handlePhotoChange,
        handleSave
    } = useEditEquipmentViewModel();

    // Helper to render field as label or input/select
    const renderField = (label, value, setValue, isEditing, setEditing, isSelect = false) => (
        <div className="relative border-b border-gray-700 pb-2">
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{label}</label>

            <div className="flex justify-between items-center min-h-[40px]">
                {isEditing ? (
                    isSelect ? (
                        <select
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-gray-800 text-white p-2 rounded border border-blue-500 outline-none"
                            autoFocus
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
                    ) : (
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-gray-800 text-white p-2 rounded border border-blue-500 outline-none"
                            autoFocus
                        />
                    )
                ) : (
                    <span className="text-gray-100 text-lg font-medium pl-1">
                        {value || <span className="text-gray-600 italic">Not set</span>}
                    </span>
                )}

                {/* Edit Toggle */}
                <button
                    onClick={() => setEditing(!isEditing)}
                    className="ml-4 text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-full hover:bg-gray-800"
                    title={isEditing ? "Save Field" : "Edit Field"}
                >
                    {isEditing ? <FaCheck /> : <FaPen size={14} />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
            <div className="bg-gray-900 w-full max-w-lg p-8 rounded-2xl shadow-2xl relative border border-gray-800">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FaTimes size={20} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2 text-center">Edit Equipment</h2>
                {error && <p className="text-red-400 text-center text-sm mb-6">{error}</p>}
                {!error && <p className="text-gray-400 text-center text-sm mb-6">Update the details below</p>}

                {/* Photo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group">
                        <div
                            className={`w-32 h-32 rounded-full overflow-hidden border-4 ${editPhoto ? "border-blue-500" : "border-gray-700"} flex items-center justify-center bg-gray-800 shadow-lg`}
                        >
                            {photo ? (
                                <img
                                    src={photo}
                                    alt="Equipment"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <FaUpload className="text-gray-500 text-3xl" />
                            )}
                        </div>

                        {/* Edit Photo Button */}
                        <button
                            onClick={() => {
                                if (editPhoto) fileInputRef.current.click();
                                else setEditPhoto(true);
                            }}
                            className="absolute bottom-0 right-0 bg-blue-600 p-2.5 rounded-full text-white shadow-lg hover:bg-blue-500 transition-all border-4 border-gray-900"
                            title="Change Photo"
                        >
                            <FaPen size={12} />
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                    />
                </div>

                {/* Fields Container */}
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {renderField("Equipment Description", equipDescription, setEquipDescription, editDescription, setEditDescription)}
                    {renderField("Equipment Type", type, setType, editType, setEditType, true)}
                    {renderField("Tag No", tagNo, setTagNo, editTagNo, setEditTagNo)}
                    {renderField("Plant Name", plantName, setPlantName, editPlant, setEditPlant)}
                    {renderField("DOSH Registration No", dosh, setDosh, editDosh, setEditDosh)}
                </div>

                {/* Save Button Only */}
                <div className="mt-8">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`w-full py-3 rounded-xl text-white font-semibold hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition
                            ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600"}
                        `}
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
