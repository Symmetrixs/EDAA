import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";

export function useEditEquipmentViewModel() {
    const navigate = useNavigate();
    const location = useLocation();

    // Retrieve equipment passed from VesselManagement
    const equipment = location.state?.equipment || {};
    // ID reference
    const equipID = equipment.EquipID;

    const onClose = () => navigate("/dashboard/vesselmanagement"); // Go back to list

    // Form State (Initialized with existing data)
    const [equipDescription, setEquipDescription] = useState(equipment.EquipDescription || "");
    const [type, setType] = useState(equipment.EquipType || "");
    const [tagNo, setTagNo] = useState(equipment.TagNo || "");
    const [plantName, setPlantName] = useState(equipment.PlantName || "");
    const [dosh, setDosh] = useState(equipment.DOSH || "");
    const [photo, setPhoto] = useState(equipment.Photo || null); // URL String
    const [photoFile, setPhotoFile] = useState(null); // File object

    // Loading/Error State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Toggle states for inline editing UI
    const [editDescription, setEditDescription] = useState(false);
    const [editType, setEditType] = useState(false);
    const [editTagNo, setEditTagNo] = useState(false);
    const [editPlant, setEditPlant] = useState(false);
    const [editDosh, setEditDosh] = useState(false);
    const [editPhoto, setEditPhoto] = useState(false);

    const fileInputRef = useRef(null);

    // --- Actions ---

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPhoto(objectUrl);
            setPhotoFile(file); // Store file
            setEditPhoto(false);
        }
    };

    const handleSave = async () => {
        if (!equipDescription || !type || !tagNo || !plantName) {
            alert("Please enter all required fields.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            let finalPhotoUrl = photo;

            // Upload Photo if Changed
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
                Photo: finalPhotoUrl // This would be the URL after upload
            };

            await api.put(`/vessel/${equipID}`, payload);

            alert("Equipment updated successfully!");
            onClose();

        } catch (err) {
            console.error("Update failed:", err);
            setError(err.response?.data?.detail || "Failed to update equipment.");
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

        // Toggles
        editDescription, setEditDescription,
        editType, setEditType,
        editTagNo, setEditTagNo,
        editPlant, setEditPlant,
        editDosh, setEditDosh,
        editPhoto, setEditPhoto,

        // Actions
        handlePhotoChange,
        handleSave
    };
}
