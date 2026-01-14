import { useState, useEffect } from "react";
import api from "../api/axios";

export default function useInspectionPart2ViewModel(inspectionId) {
    const [photosByCategory, setPhotosByCategory] = useState({
        General: [],
        Identification: [],
        External: [],
        Internal: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (inspectionId) {
            fetchPhotos();
        }
    }, [inspectionId]);

    const fetchPhotos = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/photo/inspection/${inspectionId}`);
            const photos = response.data;

            const rawPhotosByCategory = {
                General: [],
                Identification: [],
                External: [],
                Internal: []
            };

            photos.forEach(p => {
                const cat = p.Category || "General";
                if (rawPhotosByCategory[cat]) {
                    rawPhotosByCategory[cat].push(p);
                } else {
                    if (!rawPhotosByCategory["General"]) rawPhotosByCategory["General"] = [];
                    rawPhotosByCategory["General"].push(p);
                }
            });

            Object.keys(rawPhotosByCategory).forEach(cat => {
                rawPhotosByCategory[cat].sort((a, b) => (a.PhotoNumbering || 0) - (b.PhotoNumbering || 0));
            });

            const organized = {
                General: [],
                Identification: [],
                External: [],
                Internal: []
            };

            Object.keys(rawPhotosByCategory).forEach(cat => {
                let currentMain = null;
                const categoryPhotos = rawPhotosByCategory[cat];

                categoryPhotos.forEach(photo => {
                    const findingText = photo.Finding?.Description || "";
                    const recommendText = photo.Recommendation?.Description || "Nil";

                    const photoObj = {
                        id: photo.PhotoID,
                        mainPhoto: photo.PhotoURL,
                        group: [],
                        caption: photo.Caption || "",
                        finding: findingText,
                        recommendation: recommendText,
                        updatedFinding: findingText,
                        updatedRecommendation: recommendText,
                        findingId: photo.FindingID,
                        recommendId: photo.RecommendID,
                        photoNumbering: photo.PhotoNumbering,
                        aiGenerated: !!photo.AnnotatedPhotoURL,
                        canvasImageUrl: photo.CanvasPhotoURL || null,
                        hasCanvas: !!photo.CanvasPhotoURL,
                        annotatedImageUrl: photo.AnnotatedPhotoURL || null
                    };

                    if (photo.Caption === "Grouped image" && currentMain) {
                        // Add as full object to group
                        currentMain.group.push(photoObj);
                    } else {
                        // New main group
                        organized[cat].push(photoObj);
                        currentMain = photoObj;
                    }
                });
            });

            setPhotosByCategory(organized);
        } catch (err) {
            console.error("Failed to fetch photos:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (category, itemId, field, value) => {
        setPhotosByCategory(prev => ({
            ...prev,
            [category]: prev[category].map(item => {
                // Check main item
                if (item.id === itemId) {
                    return { ...item, [field]: value };
                }
                // Check inside group
                if (item.group && item.group.some(g => g.id === itemId)) {
                    return {
                        ...item,
                        group: item.group.map(g =>
                            g.id === itemId ? { ...g, [field]: value } : g
                        )
                    };
                }
                return item;
            })
        }));
    };

    const saveFindings = async () => {
        try {
            setLoading(true);

            for (const category of Object.keys(photosByCategory)) {
                const photosInCategory = photosByCategory[category];

                // Check both main items and their groups
                const allItems = [];
                photosInCategory.forEach(item => {
                    allItems.push(item);
                    if (item.group && item.group.length > 0) {
                        allItems.push(...item.group);
                    }
                });

                for (const item of allItems) {
                    if (item.findingId) {
                        await api.put(`/finding/${item.findingId}`, {
                            Description: item.finding
                        });
                    } else if (item.finding.trim() !== "") {
                        const findingResp = await api.post("/finding/", {
                            Description: item.finding
                        });
                        const newFindingId = findingResp.data.FindingID;

                        await api.put(`/photo/${item.id}`, {
                            FindingID: newFindingId
                        });

                        // We rely on fetchPhotos to update state IDs, so no local state update needed here strictly
                        // but good for responsiveness.
                    }

                    if (item.recommendId) {
                        await api.put(`/recommendation/${item.recommendId}`, {
                            Description: item.recommendation
                        });
                    } else if (item.recommendation.trim() !== "" && item.recommendation.trim().toLowerCase() !== "nil") {
                        const recResp = await api.post("/recommendation/", {
                            Description: item.recommendation
                        });
                        const newRecId = recResp.data.RecommendID;

                        await api.put(`/photo/${item.id}`, {
                            RecommendID: newRecId
                        });
                    }
                }
            }

            alert("Findings saved successfully!");
            fetchPhotos();
        } catch (err) {
            console.error("Failed to save findings:", err);
            alert("Failed to save findings.");
        } finally {
            setLoading(false);
        }
    };

    const runAIDetection = async (inspectionId, category) => {
        try {
            setLoading(true);

            const response = await api.post(
                `/photo/batch-detect/${inspectionId}?category=${category}`,
                {}
            );

            console.log('AI Detection Response:', response.data); // 🐛 DEBUG

            if (response.data.success) {
                // ✨ Convert base64 to data URLs and update state
                const resultsMap = {};
                response.data.results.forEach(result => {
                    console.log(`Photo ${result.photo_id}:`, { // 🐛 DEBUG
                        has_base64: !!result.annotated_image_base64,
                        base64_length: result.annotated_image_base64?.length
                    });

                    if (result.annotated_image_base64) {
                        resultsMap[result.photo_id] = `data:image/jpeg;base64,${result.annotated_image_base64}`;
                    }
                });

                console.log('Results Map:', resultsMap); // 🐛 DEBUG

                // Refresh photo data from database
                await fetchPhotos();

                // Update with annotated images
                // Update with annotated images
                setPhotosByCategory(prev => ({
                    ...prev,
                    [category]: prev[category].map(item => {
                        // Check main item
                        let updatedItem = { ...item };
                        if (resultsMap[item.id]) {
                            updatedItem.aiGenerated = true;
                            updatedItem.annotatedImageUrl = resultsMap[item.id];
                        }

                        // Check grouped items
                        if (item.group && item.group.length > 0) {
                            updatedItem.group = item.group.map(g => {
                                if (resultsMap[g.id]) {
                                    return {
                                        ...g,
                                        aiGenerated: true,
                                        annotatedImageUrl: resultsMap[g.id]
                                    };
                                }
                                return g;
                            });
                        }
                        return updatedItem;
                    })
                }));

                return response.data;
            } else {
                throw new Error('AI detection failed');
            }
        } catch (error) {
            console.error('Error running AI detection:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const redetectPhoto = async (photoId, category) => {
        try {
            setLoading(true);

            const response = await api.post(`/photo/redetect/${photoId}`, {});

            if (response.data.success) {
                // ✨ Convert base64 to data URL
                const annotatedImageUrl = response.data.annotated_image_base64
                    ? `data:image/jpeg;base64,${response.data.annotated_image_base64}`
                    : null;

                setPhotosByCategory(prev => ({
                    ...prev,
                    [category]: prev[category].map(item => {
                        // Check main item
                        if (item.id === photoId) {
                            return {
                                ...item,
                                finding: response.data.finding,
                                recommendation: response.data.recommendation,
                                aiGenerated: true,
                                annotatedImageUrl: annotatedImageUrl
                            };
                        }
                        // Check grouped items
                        if (item.group && item.group.length > 0) {
                            const updatedGroup = item.group.map(g => {
                                if (g.id === photoId) {
                                    return {
                                        ...g,
                                        finding: response.data.finding,
                                        recommendation: response.data.recommendation,
                                        aiGenerated: true,
                                        annotatedImageUrl: annotatedImageUrl
                                    };
                                }
                                return g;
                            });
                            if (updatedGroup !== item.group) {
                                return { ...item, group: updatedGroup };
                            }
                        }
                        return item;
                    })
                }));

                return response.data;
            } else {
                throw new Error('Re-detection failed');
            }
        } catch (error) {
            console.error('Error re-detecting photo:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return {
        photosByCategory,
        loading,
        error,
        handleInputChange,
        saveFindings,
        runAIDetection,
        redetectPhoto,
        fetchPhotos
    };
}
