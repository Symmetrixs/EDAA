import { useState, useEffect } from "react";
import api from "../api/axios";

export function useAdminAnalyticsViewModel() {
    const [stats, setStats] = useState({
        totalInspections: 0,
        pendingReports: 0,
        completedReports: 0,
        activeInspectors: 0
    });
    const [equipmentStats, setEquipmentStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [year, setYear] = useState(new Date().getFullYear().toString());

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [statsRes, equipRes] = await Promise.all([
                api.get("/admin/stats"),
                api.get(`/admin/stats/equipment?year=${year}`)
            ]);

            const data = statsRes.data;
            if (data.error) {
                setError(data.error);
            }

            setStats({
                totalInspections: data.total_inspections || 0,
                pendingReports: data.pending_reports || 0,
                completedReports: data.completed_reports || 0,
                activeInspectors: data.active_inspectors || 0
            });

            setEquipmentStats(equipRes.data || []);

            if (!data.error) setError("");
        } catch (err) {
            console.error("Fetch Stats Error:", err);
            const msg = err.response?.data?.detail || err.message || "Failed to load statistics.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [year]); // Refetch when year changes

    return {
        stats,
        equipmentStats,
        loading,
        error,
        refresh: fetchStats,
        year,
        setYear
    };
}
