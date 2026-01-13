import { useState, useEffect } from "react";
import api from "../api/axios";

export function useAdminVesselViewModel() {
    const [vessels, setVessels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Initial Form State
    const initialFormState = {
        EquipDescription: "",
        EquipType: "",
        TagNo: "",
        PlantName: "",
        DOSH: "",
        Last_Inspection_Date: "",
        Next_Inspection_Date: ""
    };

    const fetchVessels = async () => {
        setLoading(true);
        try {
            const response = await api.get("/vessel/");
            setVessels(response.data);
            setError("");
        } catch (err) {
            console.error("Fetch Vessels Error:", err);
            setError("Failed to load vessels.");
        } finally {
            setLoading(false);
        }
    };

    const addVessel = async (vesselData) => {
        try {
            const payload = {
                ...vesselData,
                Photo: "" // Optional field, default empty for now
            };
            await api.post("/vessel/", payload);
            await fetchVessels();
            return true;
        } catch (err) {
            console.error("Add Vessel Error:", err);
            setError("Failed to add vessel.");
            return false;
        }
    };

    const updateVessel = async (id, vesselData) => {
        try {
            await api.put(`/vessel/${id}`, vesselData);
            await fetchVessels(); // Refresh list to get latest state
            return true;
        } catch (err) {
            console.error("Update Vessel Error:", err);
            setError("Failed to update vessel.");
            return false;
        }
    };

    const deleteVessel = async (id) => {
        try {
            await api.delete(`/vessel/${id}`);
            setVessels((prev) => prev.filter((v) => v.EquipID !== id));
            return true;
        } catch (err) {
            console.error("Delete Vessel Error:", err);
            setError("Failed to delete vessel.");
            return false;
        }
    };

    useEffect(() => {
        fetchVessels();
    }, []);

    return {
        vessels,
        loading,
        error,
        addVessel,
        updateVessel,
        deleteVessel,
        initialFormState
    };
}
