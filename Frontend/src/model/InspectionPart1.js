
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function useInspectionPhotoViewModel(onSuccess) {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data State
    const [selectedEquipment, setSelectedEquipment] = useState("");
    const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
    const [equipmentList, setEquipmentList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [activeTab, setActiveTab] = useState("Uncategorized");
    const [photosByCategory, setPhotosByCategory] = useState({
        Uncategorized: [],
        General: [],
        Identification: [],
        External: [],
        Internal: [],
    });

    const [draggingPhoto, setDraggingPhoto] = useState(null);
    const [unitTitles, setUnitTitles] = useState({});
    const [menuOpen, setMenuOpen] = useState(null);

    //----------------------------------------
    //Current EDAA Detection State == false (Wait for Updating)
    //----------------------------------------
    const [edaaDetection, setEdaaDetection] = useState(false); // New State

    // UI State
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                const response = await api.get("/vessel/");
                const formatted = response.data.map((item) => ({
                    id: item.EquipID,
                    name: `${item.TagNo} - ${item.EquipDescription}`,
                    plantName: item.PlantName || "UNKNOWN",
                    tagNo: item.TagNo || "UNKNOWN",
                }));
                setEquipmentList(formatted);
            } catch (error) {
                console.error("Failed to fetch equipment:", error);
            }
        };
        fetchEquipment();
    }, []);

    const filteredEquipment = equipmentList.filter((eq) =>
        eq.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Handlers ---

    // Helper: Upload Logic
    const uploadPhoto = async (file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await api.post("/photo/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data.url;
        } catch (err) {
            console.error("Upload failed", err);
            if (err.response) {
                console.error("Server Response:", err.response.data);
                throw new Error(`Failed to upload image: ${err.response.data.detail || err.response.statusText}`);
            }
            throw new Error(`Failed to upload image: ${err.message}`);
        }
    };

    const handleNextStep = async () => {
        if (!selectedEquipmentId) {
            alert("Please select an equipment first.");
            return;
        }
        if (!user || !user.id) {
            alert("User not authenticated.");
            return;
        }

        setLoading(true); // Start Loading

        try {
            // Find selected equipment details for ReportNo generation
            const selectedEq = equipmentList.find(eq => eq.id === selectedEquipmentId);
            const plantName = selectedEq ? selectedEq.plantName.replace(/\s+/g, '') : "UNKNOWN";
            const tagNo = selectedEq ? selectedEq.tagNo : "UNKNOWN";
            const year = new Date().getFullYear();
            const reportNo = `${plantName}/VI/${tagNo}/TA${year}`;

            // 1. Create Inspection
            const inspectionData = {
                EquipID: selectedEquipmentId,
                UserID_Inspector: user.id,
                ReportNo: reportNo,
                ReportDate: new Date().toISOString().split("T")[0],
                Status: "Pending",
                EDAA_Detection: edaaDetection,
            };

            const inspResponse = await api.post("/inspection/", inspectionData);
            const newInspectionId = inspResponse.data.InspectionID;
            console.log("Created Inspection ID:", newInspectionId);

            if (!newInspectionId) {
                alert("Critical Error: valid InspectionID was not returned by the server. Response: " + JSON.stringify(inspResponse.data));
                if (inspResponse.data.inspectionid) alert("Found lowercase 'inspectionid': " + inspResponse.data.inspectionid);
                setLoading(false);
                return;
            }

            // 2. Upload Photos & Create Records
            const categoryOrder = ["General", "Identification", "External", "Internal"];
            let globalPhotoCounter = 1;

            for (const category of categoryOrder) {
                const items = photosByCategory[category];
                if (!items || items.length === 0) continue;

                for (let index = 0; index < items.length; index++) {
                    const item = items[index];

                    // Upload Main Photo
                    let mainPhotoUrl = item.url;
                    if (item.file) {
                        mainPhotoUrl = await uploadPhoto(item.file);
                    }

                    // Main Photo
                    await api.post("/photo/", {
                        InspectionID: newInspectionId,
                        PhotoURL: mainPhotoUrl,
                        PhotoNumbering: globalPhotoCounter,
                        Category: category,
                        Caption: unitTitles[item.id] || "",
                    });

                    // Grouped Photos (Children)
                    if (item.group && item.group.length > 0) {
                        for (let childIndex = 0; childIndex < item.group.length; childIndex++) {
                            const child = item.group[childIndex];

                            // Upload Child Photo
                            let childPhotoUrl = child.url;
                            if (child.file) {
                                childPhotoUrl = await uploadPhoto(child.file);
                            }

                            // Calculate Decimal Numbering (e.g., Parent 3.0 -> Child 3.1)
                            const decimalNumber = parseFloat((globalPhotoCounter + (childIndex + 1) / 10).toFixed(1));

                            await api.post("/photo/", {
                                InspectionID: newInspectionId,
                                PhotoURL: childPhotoUrl,
                                PhotoNumbering: decimalNumber,
                                Category: category,
                                Caption: "Grouped image",
                            });
                        }
                    }

                    // Increment global counter after processing the parent unit
                    globalPhotoCounter++;
                }
            }

            // Decimal Numbering Refinement (Optional but good)
            // Just strictly invalidating "blob" is the goal.

            if (onSuccess) {
                // Smooth transition: No alert, just callback
                onSuccess(newInspectionId);
            } else {
                alert("Inspection created and photos saved successfully!");
                navigate("/dashboard/inspection");
            }
        } catch (error) {
            console.error("Error creating inspection:", error);
            const errorMessage = error.response?.data?.detail || error.message || "Unknown error";
            alert(`Failed to save inspection: ${errorMessage}`);
        } finally {
            setLoading(false); // Stop Loading
        }
    };

    const handleFileUpload = (e) => {
        if (!selectedEquipment) return;

        const files = Array.from(e.target.files);
        const newPhotos = files.map((file) => ({
            id: Date.now() + Math.random(),
            url: URL.createObjectURL(file),
            file: file, // Store raw file
            group: [],
        }));

        setPhotosByCategory((prev) => ({
            ...prev,
            Uncategorized: [...prev.Uncategorized, ...newPhotos],
        }));
    };

    const getPhotoCategory = (photoId) => {
        for (let cat of Object.keys(photosByCategory)) {
            if (photosByCategory[cat].some((p) => p.id === photoId)) return cat;
            for (let unit of photosByCategory[cat]) {
                if (unit.group?.some((g) => g.id === photoId)) return cat;
            }
        }
        return null;
    };

    const assignCategory = (photoId, targetCategory) => {
        const updated = { ...photosByCategory };
        let photoToMove;

        Object.keys(updated).forEach((cat) => {
            updated[cat] = updated[cat].filter((p) => {
                if (String(p.id) === String(photoId)) {
                    photoToMove = p;
                    return false;
                }
                if (p.group) {
                    p.group = p.group.filter((c) => {
                        if (String(c.id) === String(photoId)) {
                            photoToMove = c;
                            return false;
                        }
                        return true;
                    });
                }
                return true;
            });
        });

        if (photoToMove) {
            updated[targetCategory].push(photoToMove);
            setPhotosByCategory(updated);
        } else {
            console.warn("Photo to move not found:", photoId);
        }
        setMenuOpen(null);
    };

    const removePhoto = (photoId) => {
        const updated = { ...photosByCategory };

        Object.keys(updated).forEach((cat) => {
            updated[cat] = updated[cat].filter((p) => {
                if (p.id === photoId) return false;
                if (p.group) p.group = p.group.filter((c) => c.id !== photoId);
                return true;
            });
        });

        setPhotosByCategory(updated);
        setMenuOpen(null);
    };

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id || activeTab === "Uncategorized") return;

        setPhotosByCategory((prev) => {
            const updated = [...prev[activeTab]];

            const findAndRemove = (id) => {
                for (let i = 0; i < updated.length; i++) {
                    const unit = updated[i];
                    if (unit.id === id) return updated.splice(i, 1)[0];
                    if (unit.group) {
                        const childIdx = unit.group.findIndex((c) => c.id === id);
                        if (childIdx !== -1) return unit.group.splice(childIdx, 1)[0];
                    }
                }
                return null;
            };

            const dragged = findAndRemove(active.id);
            if (!dragged) return prev;

            const isLine = String(over.id).startsWith("line-");
            const targetId = isLine
                ? String(over.id).replace("line-", "")
                : over.id;

            const targetIndex = updated.findIndex(
                (u) => String(u.id) === String(targetId)
            );

            if (targetIndex === -1) updated.push(dragged);
            else if (isLine) updated.splice(targetIndex, 0, dragged);
            else {
                if (!updated[targetIndex].group) updated[targetIndex].group = [];
                updated[targetIndex].group.push(dragged);
            }

            return { ...prev, [activeTab]: updated };
        });
    };

    return {
        // State
        selectedEquipment,
        setSelectedEquipment,
        selectedEquipmentId,
        setSelectedEquipmentId,
        equipmentList,
        filteredEquipment,
        searchTerm,
        setSearchTerm,
        isDropdownOpen,
        setIsDropdownOpen,
        activeTab,
        setActiveTab,
        photosByCategory,
        setPhotosByCategory,
        draggingPhoto,
        setDraggingPhoto,
        unitTitles,
        setUnitTitles,
        menuOpen,
        setMenuOpen,

        // Handlers
        handleNextStep,
        handleFileUpload,
        getPhotoCategory,
        assignCategory,
        removePhoto,
        handleDragEnd,
        handleDragEnd,
        navigate,
        edaaDetection,
        setEdaaDetection,
        loading // Export loading
    };
}
