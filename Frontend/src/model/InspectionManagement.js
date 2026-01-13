
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function useInspectionManagementViewModel() {
    const { user } = useAuth();
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editInspection, setEditInspection] = useState(null);

    useEffect(() => {
        const fetchInspections = async () => {
            if (!user?.id) return;
            try {
                // Fetch inspections for the current user ID
                const response = await api.get(`/inspection/user/${user.id}`);
                setInspections(response.data);
            } catch (error) {
                console.error("Failed to fetch inspections:", error);
                // Optionally alert user or set error state
            } finally {
                setLoading(false);
            }
        };

        fetchInspections();
    }, [user]);

    const filteredInspections = inspections.filter(ins =>
        ins.ReportNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ins.Status && ins.Status.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleUpdateInspection = (updatedInspection) => {
        setInspections(
            inspections.map((ins) =>
                ins.InspectionID === updatedInspection.InspectionID ? updatedInspection : ins
            )
        );
        setEditInspection(null);
    };

    const handleDelete = async (inspectionID) => {
        if (!window.confirm("Are you sure you want to delete this inspection? This action cannot be undone and will delete all associated photos.")) {
            return;
        }

        setLoading(true);
        try {
            await api.delete(`/inspection/${inspectionID}`);
            setInspections(inspections.filter((ins) => ins.InspectionID !== inspectionID));
            alert("Inspection deleted successfully.");
        } catch (error) {
            console.error("Failed to delete inspection:", error);
            alert("Failed to delete inspection.");
        } finally {
            setLoading(false);
        }
    };

    return {
        inspections,
        filteredInspections,
        loading,
        searchTerm,
        setSearchTerm,
        editInspection,
        setEditInspection,
        handleUpdateInspection,
        handleDelete
    };
}
