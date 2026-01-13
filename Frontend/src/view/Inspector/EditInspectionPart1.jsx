import React, { useState } from "react";
import {
    FaTimes, FaUpload, FaEllipsisV, FaRegImage
} from "react-icons/fa";
import {
    DndContext,
    useDraggable,
    useDroppable,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import useEditInspectionViewModel from "../../model/EditInspection";

const categories = [
    "Uncategorized",
    "General",
    "Identification",
    "External",
    "Internal",
];

// --- Droppable/Draggable Components ---

// Prop-drilled Helper Components
const DraggablePhoto = ({
    photo,
    parentUnit,
    // dependencies passed as props
    inspectionCategories,
    activeTab,
    getPhotoCategory,
    menuOpen,
    setMenuOpen,
    removePhoto,
    assignCategory
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: photo.id,
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px,0)` }
        : {};

    const availableCategories = inspectionCategories.filter(
        (c) => c !== "Uncategorized" && c !== getPhotoCategory(photo.id)
    );

    const [submenuOpen, setSubmenuOpen] = useState(false);

    return (
        <div className={`relative w-full ${parentUnit ? "ml-8" : ""}`}>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                className="flex items-start gap-4 border border-gray-700 p-3 rounded-lg mb-3 
                 bg-gray-800 shadow-sm hover:shadow-md transition-shadow z-10"
            >
                <img
                    src={photo.url}
                    {...listeners}
                    className="w-32 h-32 object-cover rounded cursor-move hover:opacity-90 transition border border-gray-600"
                />

                <div className="ml-auto relative">
                    <button
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === photo.id ? null : photo.id);
                            setSubmenuOpen(false);
                        }}
                    >
                        <FaEllipsisV />
                    </button>

                    {menuOpen === photo.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 text-sm overflow-hidden text-blue-100">
                            <button
                                onClick={() => removePhoto(photo.id)}
                                className="w-full text-left px-4 py-3 hover:bg-red-900/30 text-red-400 transition"
                            >
                                Remove Photo
                            </button>
                            {activeTab !== "Uncategorized" && availableCategories.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setSubmenuOpen(!submenuOpen)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-800 border-t border-gray-700 text-blue-100 transition"
                                    >
                                        Move to Category...
                                    </button>
                                    {submenuOpen && (
                                        <div className="bg-gray-950 border-t border-gray-700">
                                            {availableCategories.map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => assignCategory(photo.id, cat)}
                                                    className="w-full text-left px-6 py-2 hover:bg-gray-800 text-gray-300 text-xs transition"
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
                {!parentUnit && activeTab === "Uncategorized" && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {inspectionCategories.slice(1).map((catBtn) => (
                            <button
                                key={catBtn}
                                onClick={() => assignCategory(photo.id, catBtn)}
                                className="px-2 py-1 text-[10px] font-medium bg-gray-700 text-blue-200 rounded-full 
                                     hover:bg-blue-600 hover:text-white transition-colors"
                            >
                                {catBtn}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const DroppableUnit = ({
    unit,
    index,
    // props
    activeTab,
    photosByCategory,
    unitTitles,
    setUnitTitles,
    // DraggablePhoto dependencies
    inspectionCategories,
    getPhotoCategory,
    menuOpen,
    setMenuOpen,
    removePhoto,
    assignCategory
}) => {
    const { isOver, setNodeRef } = useDroppable({ id: unit.id });
    const { setNodeRef: setLineRef, isOver: isOverLine } = useDroppable({
        id: `line-${unit.id}`,
    });

    const getCategoryStartIndex = (currentCategory) => {
        let count = 0;
        const categoryOrder = ["General", "Identification", "External", "Internal"];
        for (const cat of categoryOrder) {
            if (cat === currentCategory) break;
            count += (photosByCategory[cat]?.length || 0);
        }
        return count;
    };

    const startIndex = getCategoryStartIndex(activeTab);
    const globalNumber = startIndex + index + 1;

    return (
        <div>
            <div
                ref={setLineRef}
                className={`h-2 rounded transition-colors ${isOverLine ? "bg-blue-500" : "bg-transparent"}`}
            />
            <div
                ref={setNodeRef}
                className={`border p-3 rounded-lg shadow-sm transition-colors ${isOver ? "bg-gray-700 border-blue-500" : "bg-gray-800 border-gray-700"
                    }`}
            >
                <div className="flex items-center mb-2 gap-2">
                    <span className="font-bold text-blue-200 text-sm">{globalNumber}.0</span>
                    <input
                        type="text"
                        placeholder="Caption..."
                        value={unitTitles[unit.id] || ""}
                        onChange={(e) =>
                            setUnitTitles((prev) => ({ ...prev, [unit.id]: e.target.value }))
                        }
                        className="flex-1 p-1 bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none text-blue-100 text-sm"
                    />
                </div>
                <DraggablePhoto
                    photo={unit}
                    inspectionCategories={inspectionCategories}
                    activeTab={activeTab}
                    getPhotoCategory={getPhotoCategory}
                    menuOpen={menuOpen}
                    setMenuOpen={setMenuOpen}
                    removePhoto={removePhoto}
                    assignCategory={assignCategory}
                />
                {unit.group?.map((child) => (
                    <DraggablePhoto
                        key={child.id}
                        photo={child}
                        parentUnit={unit}
                        inspectionCategories={inspectionCategories}
                        activeTab={activeTab}
                        getPhotoCategory={getPhotoCategory}
                        menuOpen={menuOpen}
                        setMenuOpen={setMenuOpen}
                        removePhoto={removePhoto}
                        assignCategory={assignCategory}
                    />
                ))}
            </div>
        </div>
    );
};

export default function EditInspection({ inspection, onSubmit, onClose, isEmbedded }) {
    const {
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
        handleSave,
        handleFileUpload,
        getPhotoCategory,
        assignCategory,
        removePhoto,
        handleDragEnd
    } = useEditInspectionViewModel(inspection, onSubmit, onClose);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // --- Render ---

    // --- Render ---

    const contentJsx = (
        <div className={`bg-gray-900 flex flex-col h-full ${isEmbedded ? '' : 'w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-gray-800'}`}>
            {!isEmbedded && (
                <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Edit Inspection</h2>
                        <p className="text-gray-400 text-sm mt-1">{inspection.ReportNo} - {inspection.ReportDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition">
                        <FaTimes size={20} />
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-400">Loading photos...</div>
                ) : (
                    <>
                        <div className="border-2 border-dashed border-gray-700 bg-gray-800/50 rounded-xl p-6 mb-6 text-center hover:bg-gray-800 transition">
                            <label className="cursor-pointer">
                                <div className="flex flex-col items-center gap-2">
                                    <FaUpload className="text-blue-500 text-2xl" />
                                    <span className="text-blue-100 font-medium">Click to upload more photos</span>
                                </div>
                                <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === cat
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : "bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700"
                                        }`}
                                >
                                    {cat} ({photosByCategory[cat].length})
                                </button>
                            ))}
                        </div>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={(e) => setDraggingPhoto(photosByCategory[activeTab].find(p => p.id === e.active.id))}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 min-h-[400px]">
                                {activeTab === "Uncategorized" ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {photosByCategory.Uncategorized.length === 0 && (
                                            <p className="text-center text-gray-500 py-10">No uncategorized photos.</p>
                                        )}
                                        {photosByCategory.Uncategorized.map((p) => (
                                            <DraggablePhoto
                                                key={p.id}
                                                photo={p}
                                                // props
                                                inspectionCategories={categories}
                                                activeTab={activeTab}
                                                getPhotoCategory={getPhotoCategory}
                                                menuOpen={menuOpen}
                                                setMenuOpen={setMenuOpen}
                                                removePhoto={removePhoto}
                                                assignCategory={assignCategory}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {photosByCategory[activeTab].length === 0 && (
                                            <p className="text-center text-gray-500 py-10">Use Uncategorized tab to start.</p>
                                        )}
                                        {photosByCategory[activeTab].map((unit, idx) => (
                                            <DroppableUnit
                                                key={unit.id}
                                                unit={unit}
                                                index={idx}
                                                // props
                                                activeTab={activeTab}
                                                photosByCategory={photosByCategory}
                                                unitTitles={unitTitles}
                                                setUnitTitles={setUnitTitles}
                                                inspectionCategories={categories}
                                                getPhotoCategory={getPhotoCategory}
                                                menuOpen={menuOpen}
                                                setMenuOpen={setMenuOpen}
                                                removePhoto={removePhoto}
                                                assignCategory={assignCategory}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <DragOverlay>
                                {draggingPhoto && (
                                    <img src={draggingPhoto.url} className="w-32 h-32 object-cover rounded shadow-2xl opacity-80" />
                                )}
                            </DragOverlay>
                        </DndContext>
                    </>
                )}
            </div>

            <div className={`p-6 border-t border-gray-700 bg-gray-800 flex justify-end gap-3 ${isEmbedded ? '' : 'rounded-b-2xl'}`}>
                {!isEmbedded && <button onClick={onClose} className="px-6 py-2 text-gray-300 hover:text-white font-medium">Cancel</button>}
                <button
                    onClick={handleSave}
                    disabled={loading || photosByCategory.Uncategorized.length > 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );

    if (isEmbedded) return contentJsx;

    return (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-8 overflow-hidden">
            {contentJsx}
        </div>
    );
}
