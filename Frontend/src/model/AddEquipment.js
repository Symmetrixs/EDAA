import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export function useAddEquipmentViewModel() {
    const navigate = useNavigate();
    const onClose = () => navigate("/dashboard/vesselmanagement"); // Go back to list

    // Form State
    const [equipDescription, setEquipDescription] = useState("");
    const [type, setType] = useState("Column, Tower"); // Default selection
    const [tagNo, setTagNo] = useState("");
    const [plantName, setPlantName] = useState("");
    const [photo, setPhoto] = useState(null); // URL String for now
    const [photoFile, setPhotoFile] = useState(null); // File object for upload
    const [dosh, setDosh] = useState("");

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fileInputRef = useRef(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Local preview
            const objectUrl = URL.createObjectURL(file);
            setPhoto(objectUrl);
            setPhotoFile(file); // Store file
        }
    };

    const handleAdd = async () => {
        if (!equipDescription || !type || !tagNo || !plantName) {
            alert("Please enter all required fields.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let finalPhotoUrl = photo;

            // Upload Photo
            if (photoFile) {
                const formData = new FormData();
                formData.append("file", photoFile);

                const uploadResponse = await api.post("/photo/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                finalPhotoUrl = uploadResponse.data.url;
            }

            const payload = {
                EquipDescription: equipDescription,
                EquipType: type,
                TagNo: tagNo,
                PlantName: plantName,
                DOSH: dosh,
                Photo: finalPhotoUrl  // Send the URL string
            };

            await api.post('/vessel/', payload);

            alert("Equipment added successfully!");
            onClose();

        } catch (err) {
            console.error("Add failed:", err);
            setError(err.response?.data?.detail || "Failed to add equipment.");
        } finally {
            setLoading(false);
        }
    };

    return {
        // Data
        equipDescription, setEquipDescription,
        type, setType,
        tagNo, setTagNo,
        plantName, setPlantName,
        dosh, setDosh,
        photo, setPhoto,

        // UI State
        loading,
        error,
        fileInputRef,
        onClose,

        // Actions
        handlePhotoChange,
        handleAdd
    };
}
