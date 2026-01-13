import React from "react";
import { FaEdit, FaUserCircle } from "react-icons/fa";
import { useProfileViewModel } from "../../model/Profile";

export default function Profile() {
    const {
        // Data
        user,
        fullName, setFullName,
        phoneNo, setPhoneNo,
        address, setAddress,
        photo,

        // UI State
        loading,
        error,
        editField, setEditField,

        // Actions
        handlePhotoChange,
        handleSubmit
    } = useProfileViewModel();

    const renderField = (label, value, setter, fieldType, rows = 1) => (
        <div className="flex items-start justify-between border-b border-gray-700 pb-3">
            <div className="flex-1">
                <label className="block text-blue-300 font-medium mb-1 text-sm uppercase tracking-wide">{label}</label>
                {editField === label ? (
                    fieldType === "textarea" ? (
                        <textarea
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            rows={rows}
                            className="w-full p-2 rounded-lg bg-gray-900 border border-blue-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                        ></textarea>
                    ) : (
                        <input
                            type={fieldType}
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            className="w-full p-2 rounded-lg bg-gray-900 border border-blue-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                            autoFocus
                        />
                    )
                ) : (
                    <p className="text-gray-100 font-medium text-lg">{value || <span className="text-gray-500 italic">Not set</span>}</p>
                )}
            </div>

            {editField !== label && (
                <FaEdit
                    className="ml-4 text-gray-500 hover:text-blue-400 cursor-pointer mt-1 transition-colors"
                    onClick={() => setEditField(label)}
                    title="Edit"
                />
            )}
        </div>
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-blue-200">Loading profile...</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
            <form
                onSubmit={handleSubmit}
                className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700 animate-fadeIn"
            >
                <h1 className="text-3xl font-bold text-white mb-8 text-center border-b border-gray-700 pb-4">
                    My Profile
                </h1>

                {error && <p className="text-red-400 text-center mb-6 bg-red-900/20 p-2 rounded">{error}</p>}

                {/* Profile Photo */}
                <div className="flex justify-center mb-8 relative">
                    <div className="relative group">
                        {photo ? (
                            <img
                                src={photo}
                                alt="Profile"
                                className="h-32 w-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                            />
                        ) : (
                            <div className="h-32 w-32 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                                <FaUserCircle className="text-6xl text-gray-500" />
                            </div>
                        )}

                        <label
                            htmlFor="photo-upload"
                            className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 p-2.5 rounded-full cursor-pointer transition shadow-xl border-4 border-gray-800"
                            title="Edit Photo"
                        >
                            <FaEdit className="text-white text-sm" />
                        </label>
                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-6 mb-8">
                    {/* Read-only Email (from Auth) */}
                    <div className="border-b border-gray-700 pb-3 opacity-60">
                        <label className="block text-blue-300 font-medium mb-1 text-sm uppercase tracking-wide">Email</label>
                        <p className="text-gray-100 font-medium text-lg">{user?.email}</p>
                    </div>

                    {renderField("Full Name", fullName, setFullName, "text")}
                    {renderField("Phone Number", phoneNo, setPhoneNo, "tel")}
                    {renderField("Address", address, setAddress, "textarea", 3)}
                </div>

                {/* Submit Button (Only shows if editing something) */}
                {editField && (
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-blue-900/20"
                    >
                        Save Changes
                    </button>
                )}
                {!editField && (
                    <p className="text-center text-gray-500 text-sm italic">Click the pencil icon to edit details</p>
                )}
            </form>
        </div>
    );
}
