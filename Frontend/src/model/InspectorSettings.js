import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function useInspectorSettingsViewModel() {
    const { user } = useAuth();

    // Form State
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState(""); // Leave empty unless changing

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Fetch initial data
    useEffect(() => {
        if (user?.id) {
            fetchProfile();
        }
    }, [user?.id]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/auth/profile/${user.id}`);
            // Assuming res.data has UserName, Email
            setUsername(res.data.UserName || "");
            setEmail(res.data.Email || "");
            // Password is not returned for security
        } catch (err) {
            console.error("Fetch Settings Error", err);
            setError("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async () => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = {
                username: username,
                email: email,
                // Only send password if user typed something (and not just the mask)
                // In UI we might show placeholder.
                password: password || undefined
            };

            const res = await api.put(`/auth/profile/${user.id}`, payload);
            setSuccessMessage(res.data.message || "Settings updated successfully!");

            // Optionally refresh / User context? 
            // For now just success message.
        } catch (err) {
            console.error("Update Settings Error", err);
            // Capture specific error from backend (e.g. Supabase reauth error)
            const msg = err.response?.data?.detail || "Failed to update settings";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return {
        username, setUsername,
        email, setEmail,
        password, setPassword,
        loading,
        error,
        successMessage,
        updateSettings
    };
}
