import React, { useState } from "react";
import { FaEdit } from "react-icons/fa";
import useInspectorSettingsViewModel from "../../model/InspectorSettings";

export default function InspectorSettings() {
  const {
    username, setUsername,
    email, setEmail,
    password, setPassword,
    loading,
    error,
    successMessage,
    updateSettings
  } = useInspectorSettingsViewModel();

  const [editField, setEditField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateSettings();
    setEditField(null);
  };

  const renderField = (label, value, setter, type = "text", placeholder = "") => (
    <div className="flex items-center justify-between group">
      <div className="flex-1">
        <label className="block text-blue-200 font-medium mb-1">{label}</label>
        {editField === label ? (
          <input
            type={type}
            value={value}
            placeHolder={placeholder}
            onChange={(e) => setter(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-700 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-blue-500"
            autoFocus
          />
        ) : (
          <p className="text-blue-100 p-2 border border-transparent rounded-lg">
            {type === "password" ? "********" : (value || <span className="text-gray-500 italic">Not set</span>)}
          </p>
        )}
      </div>
      <FaEdit
        className="ml-2 text-blue-400 cursor-pointer mt-7 opacity-70 hover:opacity-100 transition"
        onClick={() => setEditField(label)}
        title="Edit"
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-700 p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-600"
      >
        <h1 className="text-3xl font-bold text-blue-100 mb-6 text-center">
          Account Settings
        </h1>

        {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-center">{error}</div>}
        {successMessage && <div className="bg-green-500/20 text-green-200 p-3 rounded mb-4 text-center">{successMessage}</div>}

        <div className="space-y-6 mb-8">
          {renderField("Username", username, setUsername)}
          {renderField("Email", email, setEmail, "email")}
          {renderField("Password", password, setPassword, "password", "Enter new password")}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full font-semibold py-3 px-4 rounded-lg transition shadow-md
            ${loading
              ? "bg-gray-600 text-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
