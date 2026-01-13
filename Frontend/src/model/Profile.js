import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export function useProfileViewModel() {
    const { user, updateUser } = useAuth();

    // State
    const [fullName, setFullName] = useState("");
    const [phoneNo, setPhoneNo] = useState("");
    const [address, setAddress] = useState("");
    const [photo, setPhoto] = useState(null); // URL string
    const [photoFile, setPhotoFile] = useState(null); // File object for upload

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editField, setEditField] = useState(null);

    // Initial Fetch
    useEffect(() => {
        if (user && user.id) {
            fetchProfile();
        }
    }, [user]);

    const getRoleEndpoint = () => {
        if (!user) return "";
        return user.role === "admin" ? "/admin" : "/inspector";
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const endpoint = getRoleEndpoint();
            const response = await api.get(`${endpoint}/${user.id}`);
            const data = response.data;

            // Populate state
            setFullName(data.FullName || "");
            setPhoneNo(data.PhoneNo || "");
            setAddress(data.Address || "");
            setPhoto(data.Photo || null);

        } catch (err) {
            console.error("Fetch Profile Error:", err);
            setError("Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Local preview
            const objectUrl = URL.createObjectURL(file);
            setPhoto(objectUrl);
            setPhotoFile(file); // Store file for upload
            setEditField("Photo"); // Trigger save button visibility
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            let finalPhotoUrl = photo;

            // Upload Photo if Changed
            if (photoFile) {
                const formData = new FormData();
                formData.append("file", photoFile);

                const uploadResponse = await api.post("/photo/upload", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });
                finalPhotoUrl = uploadResponse.data.url;
            }

            const payload = {
                FullName: fullName,
                PhoneNo: phoneNo,
                Address: address,
                Photo: finalPhotoUrl
            };

            const endpoint = getRoleEndpoint();
            // PUT request to update profile
            await api.put(`${endpoint}/${user.id}`, payload);

            alert("Profile updated successfully!");
            setPhotoFile(null); // Clear pending upload
            setPhoto(finalPhotoUrl); // Update state to new URL
            setEditField(null); // Exit edit mode

            // Sync with Global Auth State (Navbar)
            updateUser({
                name: fullName,
                photo: finalPhotoUrl
            });

        } catch (err) {
            console.error("Update Profile Error:", err);
            setError("Failed to update profile.");
        }
    };

    return {
        // Data
        user,
        fullName, setFullName,
        phoneNo, setPhoneNo,
        address, setAddress,
        photo, setPhoto,

        // UI State
        loading,
        error,
        editField, setEditField,

        // Actions
        handlePhotoChange,
        handleSubmit
    };
}
