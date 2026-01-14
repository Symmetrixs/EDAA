import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function useStatisticAnalysisViewModel() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Data for Charts
    const [inspectionSummary, setInspectionSummary] = useState({ completed: 0, pending: 0 });
    const [inspectionsByType, setInspectionsByType] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState([]);

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch User's Inspections
            const res = await api.get(`/inspection/user/${user.id}`);
            const data = res.data;

            processSummary(data);
            processByType(data);
            processTrend(data);

        } catch (err) {
            console.error("Stats Error", err);
            setError("Failed to load statistics");
        } finally {
            setLoading(false);
        }
    };

    // 1. Summary: Completed vs Pending
    const processSummary = (data) => {
        let completed = 0;
        let pending = 0;

        data.forEach(item => {
            // Normalize status to Lowercase for check
            const status = (item.Status || "").toLowerCase();

            // "Completed" includes both user-completed and admin-approved
            if (status === "completed" || status === "approved") {
                completed++;
            } else if (status === "pending") {
                pending++;
            }
            // Other statuses (e.g. Draft) are ignored or can be added if needed
        });

        setInspectionSummary({ completed, pending });
    };

    // 2. By Equipment Type
    const processByType = (data) => {
        const counts = {};

        data.forEach(item => {
            // Equipment might be null if JOIN failed or no equipment linked
            // Assuming Equipment has field 'VesselType' or 'Type' or 'EquipType'
            // Based on previous files, likely 'VesselType' if it was linked to Vessel, 
            // OR 'EquipType'. I'll try to be robust.

            const equip = item.Equipment || {};
            const type = equip.VesselType || equip.Type || equip.EquipType || "Unknown";

            counts[type] = (counts[type] || 0) + 1;
        });

        // Convert to array for Recharts
        const chartData = Object.keys(counts).map(key => ({
            type: key,
            count: counts[key]
        }));

        setInspectionsByType(chartData);
    };

    // 3. Monthly Trend
    const processTrend = (data) => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const counts = new Array(12).fill(0);

        data.forEach(item => {
            if (!item.ReportDate) return;

            // Only count Completed and Approved inspections
            const status = (item.Status || "").toLowerCase();
            if (status !== "completed" && status !== "approved") {
                return; // Skip pending and other statuses
            }

            // Allow various date formats
            const date = new Date(item.ReportDate);
            if (!isNaN(date)) {
                const monthIndex = date.getMonth(); // 0-11
                counts[monthIndex]++;
            }
        });

        const chartData = months.map((m, i) => ({
            month: m,
            count: counts[i]
        }));

        setMonthlyTrend(chartData);
    };

    return {
        loading,
        error,
        inspectionSummary,
        inspectionsByType,
        monthlyTrend
    };
}
