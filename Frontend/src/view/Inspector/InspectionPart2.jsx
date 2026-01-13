import React, { useState, useEffect } from "react";
import { FaImage, FaRobot, FaSync, FaExclamationTriangle, FaEye, FaTrash } from "react-icons/fa";
import api from "../../api/axios";
import CanvasModal from "../../components/CanvasModal";
import ViewCanvasModal from "../../components/ViewCanvasModal";

const categories = ["General", "Identification", "External", "Internal"];

import useInspectionPart2ViewModel from "../../model/InspectionPart2";

export default function InspectionPart2({ inspectionId }) {
    const [activeTab, setActiveTab] = useState("General");
    const [aiDetecting, setAiDetecting] = useState(false);
    const [redetectingId, setRedetectingId] = useState(null);
    const [modelInfo, setModelInfo] = useState({ available: true, checking: true });
    const [canvasOpen, setCanvasOpen] = useState(false);
    const [selectedGroupPhotos, setSelectedGroupPhotos] = useState([]);
    const [currentGroupId, setCurrentGroupId] = useState(null);
    const [canvasSaving, setCanvasSaving] = useState(false);
    const [canvasStates, setCanvasStates] = useState({});
    const [viewCanvasOpen, setViewCanvasOpen] = useState(false);
    const [viewCanvasUrl, setViewCanvasUrl] = useState(null);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await api.get("/ai-detection/health");
                setModelInfo({
                    available: res.data.model_loaded,
                    checking: false
                });
            } catch (err) {
                console.error("AI Health Check Failed", err);
                setModelInfo({ available: false, checking: false });
            }
        };
        checkHealth();
    }, []);

    const {
        photosByCategory,
        loading,
        handleInputChange,
        saveFindings,
        runAIDetection,
        redetectPhoto,
        fetchPhotos
    } = useInspectionPart2ViewModel(inspectionId);

    const currentCategoryData = photosByCategory[activeTab] || [];

    const handleAIDetection = async () => {
        if (!modelInfo.available) {
            alert("AI model not found. This feature will be available in a future update.");
            return;
        }

        if (!window.confirm(`Run AI detection on all photos in ${activeTab} category?`)) {
            return;
        }

        setAiDetecting(true);
        try {
            const result = await runAIDetection(inspectionId, activeTab);
            alert(`AI detection completed! ${result.processed} photos analyzed.`);
        } catch (error) {
            alert("AI detection failed: " + (error.response?.data?.detail || error.message));
        } finally {
            setAiDetecting(false);
        }
    };

    const handleRedetect = async (photoId) => {
        setRedetectingId(photoId);
        try {
            await redetectPhoto(photoId, activeTab);
            alert("Photo re-detected successfully!");
        } catch (error) {
            alert("Re-detection failed: " + (error.response?.data?.detail || error.message));
        } finally {
            setRedetectingId(null);
        }
    };

    const handleRemoveAI = async (photoId) => {
        if (!confirm('Remove AI-generated findings and recommendations for this photo? This cannot be undone.')) {
            return;
        }
        
        try {
            await api.delete(`/photo/remove-ai/${photoId}`);
            alert('AI findings removed successfully!');
            await fetchPhotos();
        } catch (error) {
            console.error('Failed to remove AI:', error);
            alert('Failed to remove AI findings: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleOpenCanvas = (item) => {
        const photosToAnnotate = [
            item,
            ...(item.group || [])
        ];
        setSelectedGroupPhotos(photosToAnnotate);
        setCurrentGroupId(item.id);
        setCanvasOpen(true);
    };

    const handleViewCanvas = (item) => {
        if (item.canvasImageUrl) {
            setViewCanvasUrl(item.canvasImageUrl);
            setViewCanvasOpen(true);
        } else {
            alert('No canvas layout available for this group yet. Click "Go Canvas" to create one.');
        }
    };

    const handleCanvasStateChange = (state) => {
        // Don't auto-save state during editing
        // State is only saved when user clicks "Save Canvas"
    };

    const handleSaveCanvas = async (canvasData) => {
        setCanvasSaving(true);
        try {
            const photoIds = selectedGroupPhotos.map(p => p.id);
            
            const response = await api.post("/photo/save-canvas-annotation", {
                inspection_id: inspectionId,
                group_photo_ids: photoIds,
                canvas_image_base64: canvasData.canvas
            });

            if (response.data.success) {
                alert(`Canvas saved successfully! ${response.data.updated_photos} photos updated.`);
                
                // Only save state after successful save
                if (currentGroupId) {
                    setCanvasStates(prev => ({
                        ...prev,
                        [currentGroupId]: {
                            images: canvasData.images,
                            shapes: canvasData.shapes,
                            labels: canvasData.labels
                        }
                    }));
                }
                
                setCanvasOpen(false);
                await fetchPhotos();
            } else {
                throw new Error("Save failed");
            }
        } catch (error) {
            console.error("Failed to save canvas:", error);
            alert("Failed to save canvas annotations: " + (error.response?.data?.detail || error.message));
        } finally {
            setCanvasSaving(false);
        }
    };

    return (
        <div className={`text-blue-100 min-h-screen bg-gray-900 ${inspectionId ? 'p-0' : 'p-8'}`}>
            {!inspectionId && <h1 className="text-3xl font-bold mb-6">Findings & Recommendations</h1>}

            <div className="flex flex-wrap gap-2 border-b border-gray-700 items-end">
                <div className="flex gap-2 flex-1">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`px-6 py-3 rounded-t-lg font-semibold transition-all relative top-[1px] ${activeTab === cat
                                ? "bg-gray-800 text-blue-400 border border-gray-700 border-b-gray-800"
                                : "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col items-end gap-1 mb-1">
                    {!modelInfo.checking && !modelInfo.available && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs px-3 py-1 rounded flex items-center gap-2 animate">
                            <FaExclamationTriangle />
                            AI model not found, will update in the future
                        </div>
                    )}
                    <button
                        onClick={handleAIDetection}
                        disabled={aiDetecting || currentCategoryData.length === 0 || loading || !modelInfo.available}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg transition flex items-center gap-2 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500"
                        title={!modelInfo.available ? "AI model not found. Feature disabled." : "Run AI detection on all photos in this category"}
                    >
                        <FaRobot />
                        {aiDetecting ? "Detecting..." : "AI Detect Defects"}
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 rounded-b-xl rounded-r-xl shadow-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-900/50 text-gray-300 uppercase text-sm tracking-wider">
                        <tr>
                            <th className="px-6 py-4 w-[25%] border-r border-gray-700">Photos</th>
                            <th className="px-6 py-4 w-[30%] border-r border-gray-700">Key Findings</th>
                            <th className="px-6 py-4 w-[30%] border-r border-gray-700">Recommendations</th>
                            <th className="px-6 py-4 w-[15%]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {currentCategoryData.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                    No photos in this category.
                                </td>
                            </tr>
                        ) : (
                            currentCategoryData.map((item) => (
                                <React.Fragment key={item.id}>
                                    <tr className="border-b border-gray-700 bg-gray-800/80">
                                        <td className="px-6 py-6 align-top border-r border-gray-700">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                                                        #{item.photoNumbering ? item.photoNumbering.toFixed(1) : "N/A"}
                                                    </span>
                                                    {item.aiGenerated && (
                                                        <span className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1">
                                                            <FaRobot size={10} />
                                                            AI Generated
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="relative group">
                                                    <img
                                                        src={item.annotatedImageUrl || item.mainPhoto}
                                                        alt="Main"
                                                        className="w-full h-48 object-cover rounded-lg border border-gray-600 shadow-md"
                                                    />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate rounded-b-lg">
                                                        {item.caption}
                                                    </div>
                                                </div>

                                                {item.aiGenerated && (
                                                    <button
                                                        onClick={() => handleRedetect(item.id)}
                                                        disabled={redetectingId === item.id || !modelInfo.available}
                                                        className={`px-3 py-2 rounded-lg transition-all text-xs font-semibold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${!modelInfo.available
                                                                ? "bg-gray-700 text-gray-400 border border-gray-600"
                                                                : "bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/50"
                                                            }`}
                                                        title={!modelInfo.available ? "AI model not found. Re-detection disabled." : "Re-run AI detection on this photo"}
                                                    >
                                                        <FaSync className={redetectingId === item.id ? "animate-spin" : ""} />
                                                        {redetectingId === item.id ? "Re-detecting..." : "Re-detect"}
                                                    </button>
                                                )}

                                                {item.aiGenerated && (
                                                    <button
                                                        onClick={() => handleRemoveAI(item.id)}
                                                        className="px-3 py-2 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg transition-all text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
                                                        title="Remove AI-generated findings and recommendations"
                                                    >
                                                        <FaTrash />
                                                        Remove AI
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top border-r border-gray-700">
                                            <div className="relative">
                                                {item.aiGenerated && (
                                                    <div className="flex items-center gap-1 mb-2 text-xs text-purple-400">
                                                        <FaRobot />
                                                        <span>AI Generated (Editable)</span>
                                                    </div>
                                                )}
                                                <textarea
                                                    value={item.finding}
                                                    onChange={(e) => handleInputChange(activeTab, item.id, 'finding', e.target.value)}
                                                    placeholder="Describe the defect or finding..."
                                                    className={`w-full h-48 bg-gray-900 border rounded-lg p-3 text-blue-100 placeholder-gray-500 focus:ring-1 outline-none resize-none transition ${item.aiGenerated
                                                        ? 'border-purple-600 focus:border-purple-500 focus:ring-purple-500'
                                                        : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                                                        }`}
                                                />
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top border-r border-gray-700">
                                            <div className="relative">
                                                {item.aiGenerated && (
                                                    <div className="flex items-center gap-1 mb-2 text-xs text-purple-400">
                                                        <FaRobot />
                                                        <span>AI Generated (Editable)</span>
                                                    </div>
                                                )}
                                                <textarea
                                                    value={item.recommendation}
                                                    onChange={(e) => handleInputChange(activeTab, item.id, 'recommendation', e.target.value)}
                                                    placeholder="Suggest actions or repairs..."
                                                    className={`w-full h-48 bg-gray-900 border rounded-lg p-3 text-blue-100 placeholder-gray-500 focus:ring-1 outline-none resize-none transition ${item.aiGenerated
                                                        ? 'border-purple-600 focus:border-purple-500 focus:ring-purple-500'
                                                        : 'border-gray-600 focus:border-green-500 focus:ring-green-500'
                                                        }`}
                                                />
                                            </div>
                                        </td>

                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    className="px-4 py-2 bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/50 rounded-lg transition-all text-sm font-semibold shadow-sm whitespace-nowrap"
                                                    onClick={() => handleOpenCanvas(item)}
                                                >
                                                    Go Canvas
                                                </button>
                                                
                                                {item.canvasImageUrl && (
                                                    <button
                                                        className="px-4 py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/50 rounded-lg transition-all text-sm font-semibold shadow-sm whitespace-nowrap flex items-center justify-center gap-2"
                                                        onClick={() => handleViewCanvas(item)}
                                                    >
                                                        <FaEye size={14} />
                                                        View Canvas
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {item.group && item.group.map((child) => (
                                        <tr key={child.id} className="bg-gray-800/50 border-b border-gray-700">
                                            <td className="px-6 py-6 align-top border-r border-gray-700 pl-16 relative">
                                                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                                                <div className="absolute left-8 top-12 w-6 h-0.5 bg-gray-700"></div>

                                                <div className="flex flex-col gap-3 relative">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-gray-700 text-gray-400 text-xs font-bold px-2 py-1 rounded">
                                                            #{child.photoNumbering ? child.photoNumbering.toFixed(1) : "N/A"}
                                                        </span>
                                                        {child.aiGenerated && (
                                                            <span className="bg-purple-600/20 text-purple-300 text-xs font-bold px-2 py-1 rounded border border-purple-500/30 flex items-center gap-1">
                                                                <FaRobot size={10} />
                                                                AI
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="relative group">
                                                        <img
                                                            src={child.annotatedImageUrl || child.mainPhoto}
                                                            alt="Child"
                                                            className="w-full h-40 object-cover rounded-lg border border-gray-600 shadow-sm"
                                                        />
                                                    </div>

                                                    {child.aiGenerated && (
                                                        <button
                                                            onClick={() => handleRedetect(child.id)}
                                                            disabled={redetectingId === child.id}
                                                            className="px-3 py-2 bg-purple-600/10 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/30 rounded-lg transition-all text-xs font-semibold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                                            title="Re-run AI detection on this photo"
                                                        >
                                                            <FaSync className={redetectingId === child.id ? "animate-spin" : ""} />
                                                            {redetectingId === child.id ? "Re-detecting..." : "Re-detect"}
                                                        </button>
                                                    )}

                                                    {child.aiGenerated && (
                                                        <button
                                                            onClick={() => handleRemoveAI(child.id)}
                                                            className="px-3 py-2 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg transition-all text-xs font-semibold shadow-sm flex items-center justify-center gap-2"
                                                            title="Remove AI-generated findings and recommendations"
                                                        >
                                                            <FaTrash />
                                                            Remove AI
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-6 align-top border-r border-gray-700">
                                                <textarea
                                                    value={child.finding}
                                                    onChange={(e) => handleInputChange(activeTab, child.id, 'finding', e.target.value)}
                                                    placeholder="Describe the defect for this view..."
                                                    className={`w-full h-40 bg-gray-900/50 border rounded-lg p-3 text-blue-100 placeholder-gray-500 focus:ring-1 outline-none resize-none transition ${child.aiGenerated
                                                        ? 'border-purple-600/50 focus:border-purple-500 focus:ring-purple-500'
                                                        : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500'
                                                        }`}
                                                />
                                            </td>

                                            <td className="px-6 py-6 align-top border-r border-gray-700">
                                                <textarea
                                                    value={child.recommendation}
                                                    onChange={(e) => handleInputChange(activeTab, child.id, 'recommendation', e.target.value)}
                                                    placeholder="Recommendations for this view..."
                                                    className={`w-full h-40 bg-gray-900/50 border rounded-lg p-3 text-blue-100 placeholder-gray-500 focus:ring-1 outline-none resize-none transition ${child.aiGenerated
                                                        ? 'border-purple-600/50 focus:border-purple-500 focus:ring-purple-500'
                                                        : 'border-gray-600 focus:border-green-500 focus:ring-green-500'
                                                        }`}
                                                />
                                            </td>

                                            <td className="px-6 py-6 align-top bg-gray-900/20">
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-end gap-4">
                <button
                    onClick={saveFindings}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition"
                >
                    Save Findings (Draft)
                </button>
            </div>

            {loading && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
                    <div className="bg-gray-800 p-8 rounded-2xl flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <h3 className="text-xl font-bold text-white">Saving Findings...</h3>
                        <p className="text-gray-400 mt-2">Updating finding/recommendation records.</p>
                    </div>
                </div>
            )}

            {aiDetecting && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
                    <div className="bg-gray-800 p-8 rounded-2xl flex flex-col items-center max-w-md">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mb-4"></div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            <FaRobot className="text-purple-400" />
                            AI Detection Running
                        </h3>
                        <p className="text-gray-400 mt-3 text-center">
                            Analyzing photos for defects...
                        </p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-4 overflow-hidden">
                            <div className="h-full bg-purple-600 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                        <p className="text-gray-500 text-sm mt-3">This may take a few moments</p>
                    </div>
                </div>
            )}

            {canvasSaving && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
                    <div className="bg-gray-800 p-8 rounded-2xl flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
                        <h3 className="text-xl font-bold text-white">Saving Canvas...</h3>
                        <p className="text-gray-400 mt-2">Uploading annotated images.</p>
                    </div>
                </div>
            )}

            <CanvasModal
                isOpen={canvasOpen}
                onClose={() => {
                    setCanvasOpen(false);
                }}
                photos={selectedGroupPhotos}
                onSave={handleSaveCanvas}
                canvasState={currentGroupId ? canvasStates[currentGroupId] : null}
                onStateChange={handleCanvasStateChange}
            />

            <ViewCanvasModal
                isOpen={viewCanvasOpen}
                onClose={() => setViewCanvasOpen(false)}
                canvasUrl={viewCanvasUrl}
            />
        </div>
    );
}
