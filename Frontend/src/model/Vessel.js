import { useState, useEffect } from 'react';
import api from '../api/axios';

export function useVesselViewModel() {
    const [vessels, setVessels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch vessels on mount
    useEffect(() => {
        fetchVessels();
    }, []);

    const fetchVessels = async () => {
        setLoading(true);
        try {
            const response = await api.get('/vessel/');
            // Map API data to component state if keys match, otherwise transformation needed
            // Currently your API returns capital keys like "EquipDescription"
            // We will use them directly or map them.
            setVessels(response.data);
        } catch (err) {
            console.error("Failed to fetch vessels:", err);
            setError("Failed to load equipment data.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this equipment?")) return;

        try {
            await api.delete(`/vessel/${id}`);
            // Remove from local state immediately for UI responsiveness
            setVessels(prev => prev.filter(v => v.EquipID !== id));
            alert("Equipment deleted successfully");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Failed to delete equipment");
        }
    };

    // Filter Logic
    const filteredVessels = vessels.filter(vessel => {
        const query = searchQuery.toLowerCase();
        return (
            (vessel.EquipDescription && vessel.EquipDescription.toLowerCase().includes(query)) ||
            (vessel.TagNo && vessel.TagNo.toLowerCase().includes(query)) ||
            (vessel.PlantName && vessel.PlantName.toLowerCase().includes(query))
        );
    });

    return {
        vessels,
        filteredVessels,
        loading,
        error,
        searchQuery, setSearchQuery,
        handleDelete,
        refresh: fetchVessels
    };
}
