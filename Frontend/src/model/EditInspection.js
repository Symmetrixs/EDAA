
import { useState, useEffect } from "react";
import api from "../api/axios";

export default function useEditInspectionViewModel(inspection, onSubmit, onClose) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Uncategorized");

    // Structure: { CategoryName: [ { id, url, caption, group: [] } ] }
    const [photosByCategory, setPhotosByCategory] = useState({
        Uncategorized: [],
        General: [],
        Identification: [],
        External: [],
        Internal: [],
    });

    const [unitTitles, setUnitTitles] = useState({});
    const [menuOpen, setMenuOpen] = useState(null);
    const [draggingPhoto, setDraggingPhoto] = useState(null);

    // Memory Cleanup Ref
    const createdUrlRef = useState(new Set())[0];

    // Cleanup Effect
    useEffect(() => {
        return () => {
            createdUrlRef.forEach((url) => URL.revokeObjectURL(url));
            createdUrlRef.clear();
        };
    }, []);

    // Initial Fetch
    useEffect(() => {
        if (!inspection) return;

        const fetchPhotos = async () => {
            try {
                const response = await api.get(`/photo/inspection/${inspection.InspectionID}`);
                const photos = response.data;

                // Two-Pass Approach:
                // 1. Bucket raw photos by Category to isolate them from interleaving issues.
                const rawPhotosByCategory = {
                    Uncategorized: [],
                    General: [],
                    Identification: [],
                    Internal: [],
                    External: [],
                };

                photos.forEach(p => {
                    const cat = p.Category || "Uncategorized";
                    if (rawPhotosByCategory[cat]) {
                        rawPhotosByCategory[cat].push(p);
                    } else {
                        // Fallback for unexpected categories
                        if (!rawPhotosByCategory["Uncategorized"]) rawPhotosByCategory["Uncategorized"] = [];
                        rawPhotosByCategory["Uncategorized"].push(p);
                    }
                });

                // Sort each bucket by PhotoNumbering to ensure correct order before processing
                Object.keys(rawPhotosByCategory).forEach(cat => {
                    rawPhotosByCategory[cat].sort((a, b) => (a.PhotoNumbering || 0) - (b.PhotoNumbering || 0));
                });

                // 2. Process each category independently to build standard UI structure
                const organized = {
                    Uncategorized: [],
                    General: [],
                    Identification: [],
                    Internal: [],
                    External: [],
                };

                // Defined standard order to ensure consistent processing
                const categoryOrder = ["Uncategorized", "General", "Identification", "External", "Internal"];

                categoryOrder.forEach(cat => {
                    const categoryPhotos = rawPhotosByCategory[cat] || [];
                    let currentMain = null;

                    categoryPhotos.forEach(p => {
                        const uiPhoto = {
                            id: p.PhotoID,
                            url: p.PhotoURL,
                            caption: p.Caption,
                            dbId: p.PhotoID,
                            group: []
                        };

                        if (p.Caption === "Grouped image" && currentMain) {
                            // Child logic: Attach to the LAST main photo seen in this specific category
                            currentMain.group.push(uiPhoto);
                        } else {
                            // Main logic
                            organized[cat].push(uiPhoto);
                            currentMain = uiPhoto;

                            if (p.Caption !== "Grouped image") {
                                setUnitTitles(prev => ({ ...prev, [p.PhotoID]: p.Caption }));
                            }
                        }
                    });
                });

                setPhotosByCategory(organized);
            } catch (error) {
                console.error("Failed to fetch photos:", error);
                alert("Failed to load photos.");
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, [inspection?.InspectionID]);

    // Better approach: Track created URLs in a ref
    // const createdUrls = useRef([]);
    // inside handleFileUpload: createdUrls.current.push(url);
    // inside useEffect(() => return () => createdUrls.current.forEach(URL.revokeObjectURL), [])

    // Applying this change below in handleFileUpload and adding the ref.


    // Handlers (Duplicate logic from InspectionPhotoViewModel effectively, but adapted for Edit)
    // Limitation: Reusing the same Drag/Drop logic means copying code unless extracted to utility.
    // For now, I will copy the logic to ensure isolation.

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
        // Mark for deletion? or delete immediately?
        // Immediate delete is riskier but simpler for stateless UI.
        // Let's just remove from UI state. Save will handle diffing?
        // Implementing "Sync" on save is complex (Diffing UI vs DB).
        // Simpler approach: On Save, DELETE ALL photos for inspection and RE-INSERT?
        // Pros: Robust consistency. Cons: Slow, changes IDs.
        // Alternative: Track deleted IDs.

        // For MVP: Remove from State. On Save, we can Delete All + Re-insert, or careful updates.
        // Given complexity, "Delete All + Insert" is safest for structure changes.

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
            // ... (Same logic as InspectionPhoto)
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
            if (!dragged) return prev; // Should not happen

            const isLine = String(over.id).startsWith("line-");
            const targetId = isLine ? String(over.id).replace("line-", "") : over.id;
            const targetIndex = updated.findIndex((u) => String(u.id) === String(targetId));

            if (targetIndex === -1) updated.push(dragged);
            else if (isLine) updated.splice(targetIndex, 0, dragged);
            else {
                if (!updated[targetIndex].group) updated[targetIndex].group = [];
                updated[targetIndex].group.push(dragged);
            }
            return { ...prev, [activeTab]: updated };
        });
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newPhotos = files.map((file) => {
            const url = URL.createObjectURL(file);
            createdUrlRef.add(url); // Track for cleanup
            return {
                id: Date.now() + Math.random(),
                url: url,
                group: [],
                isNew: true,
                file: file // Store raw file for upload
            };
        });
        setPhotosByCategory((prev) => ({
            ...prev,
            Uncategorized: [...prev.Uncategorized, ...newPhotos],
        }));
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // 1. Delete all old photos first (Optimized Bulk Delete)
            await api.delete(`/photo/all/${inspection.InspectionID}`);

            // 2. Prepare and Upload New Photos if needed
            const uploadPhoto = async (photoItem) => {
                if (photoItem.isNew && photoItem.file) {
                    const formData = new FormData();
                    formData.append("file", photoItem.file);

                    try {
                        const res = await api.post("/photo/upload", formData, {
                            headers: { "Content-Type": "multipart/form-data" }
                        });
                        return res.data.url;
                    } catch (err) {
                        console.error("Upload failed for", photoItem.id, err);
                        throw new Error("Failed to upload image");
                    }
                }
                return photoItem.url; // Existing URL or uploaded URL
            };

            // 3. Save All Photos with Final URLs
            const categoryOrder = ["General", "Identification", "External", "Internal"];
            let globalPhotoCounter = 1;

            for (const category of categoryOrder) {
                const items = photosByCategory[category];
                if (!items || items.length === 0) continue;

                for (let index = 0; index < items.length; index++) {
                    const item = items[index];

                    // Upload Main Photo
                    const mainPhotoUrl = await uploadPhoto(item);

                    // Save Main Photo DB
                    await api.post("/photo/", {
                        InspectionID: inspection.InspectionID,
                        PhotoURL: mainPhotoUrl,
                        PhotoNumbering: globalPhotoCounter,
                        Category: category,
                        Caption: unitTitles[item.id] || "",
                    });

                    // Grouped Photos (Children)
                    if (item.group) {
                        for (let childIndex = 0; childIndex < item.group.length; childIndex++) {
                            const child = item.group[childIndex];
                            // Calculate Decimal Numbering (e.g., Parent 3.0 -> Child 3.1)
                            const childNum = parseFloat((globalPhotoCounter + (childIndex + 1) / 10).toFixed(1));

                            // Upload Child Photo
                            const childPhotoUrl = await uploadPhoto(child);

                            await api.post("/photo/", {
                                InspectionID: inspection.InspectionID,
                                PhotoURL: childPhotoUrl,
                                PhotoNumbering: childNum,
                                Category: category,
                                Caption: "Grouped image",
                            });
                        }
                    }

                    // Increment global counter
                    globalPhotoCounter++;
                }
            }

            alert("Inspection updated successfully!");
            onSubmit(inspection); // Notify parent (reload list)
            onClose();

        } catch (error) {
            console.error("Failed to save inspection:", error);
            alert(`Failed to save changes: ${error.message || "Unknown error"}. Check console for details.`);
        } finally {
            setLoading(false);
        }
    };

    return {
        // State
        loading,
        activeTab,
        setActiveTab,
        photosByCategory,
        unitTitles,
        setUnitTitles,
        menuOpen,
        setMenuOpen,
        draggingPhoto,
        setDraggingPhoto,

        // Handlers
        handleSave,
        handleFileUpload,
        getPhotoCategory,
        assignCategory,
        removePhoto,
        handleDragEnd
    };
}
