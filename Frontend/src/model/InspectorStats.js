
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export function useInspectorStatsViewModel() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalInspections: 0,
        pendingReports: 0,
        completedReports: 0
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchStats = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const response = await api.get(`/inspector/${user.id}/stats`);
            const data = response.data;

            setStats({
                totalInspections: data.total_inspections || 0,
                pendingReports: data.pending_reports || 0,
                completedReports: data.completed_reports || 0
            });
        } catch (err) {
            console.error("Inspector Stats Error:", err);
            setError("Failed to load statistics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [user]);

    return {
        stats,
        loading,
        error
    };
}
