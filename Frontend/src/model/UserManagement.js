import { useState, useEffect } from "react";
import api from "../api/axios";

export function useUserManagementViewModel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/users/all");
            setUsers(response.data);
            setError("");
        } catch (err) {
            console.error("Fetch Users Error:", err);
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    };

    const addUser = async (userData) => {
        // userData: { name, email, role, password }
        try {
            await api.post("/admin/users", userData);
            await fetchUsers(); // Refresh list
            return true;
        } catch (err) {
            console.error("Add User Error:", err);
            const msg = err.response?.data?.detail || "Failed to add user.";
            setError(msg);
            return false;
        }
    };

    const deleteUser = async (userId) => {
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
            return true;
        } catch (err) {
            console.error("Delete User Error:", err);
            setError("Failed to delete user.");
            return false;
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return {
        users,
        loading,
        error,
        addUser,
        deleteUser,
        refresh: fetchUsers,
    };
}
