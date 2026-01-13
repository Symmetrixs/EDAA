import React, { useState } from "react";
import { FaTrash, FaUserPlus } from "react-icons/fa";
import { useUserManagementViewModel } from "../../model/UserManagement";

export function Users() {
  const { users, loading, error, addUser, deleteUser } = useUserManagementViewModel();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "", // Added password field
    role: "inspector",
  });

  const handleAddUser = async () => {
    if (!form.name || !form.email || !form.password) return;

    const success = await addUser(form);
    if (success) {
      setForm({ name: "", email: "", password: "", role: "inspector" });
    }
  };

  const handleDeleteUser = async (id) => {
    if (confirm("Delete this user?")) {
      await deleteUser(id);
    }
  };

  return (
    <div className="p-8 text-blue-100 min-h-full">
      {/* Page Header */}
      <h1 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
        User Management
      </h1>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Add User Form */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-fit">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-blue-300">
            <FaUserPlus /> Add New User
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none transition"
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email Address</label>
              <input
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none transition"
                placeholder="e.g. john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none transition"
                placeholder="******"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <select
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none transition"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="inspector">Inspector</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              onClick={handleAddUser}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition shadow-md mt-4 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add User"}
            </button>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>

        {/* Right: Users List */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Registered Users</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                    <td className="px-6 py-4 text-gray-300">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${u.role === "admin"
                          ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                          : "bg-blue-900/50 text-blue-300 border border-blue-700"
                          }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-400 hover:text-red-300 transition p-2 hover:bg-red-900/20 rounded"
                        title="Delete User"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
