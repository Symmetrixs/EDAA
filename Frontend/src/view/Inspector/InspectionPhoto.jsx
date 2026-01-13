import React, { useState } from "react";
// Remove useNavigate since it's handled in ViewModel or passed down
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
import {
  FaCamera,
  FaUpload,
  FaArrowLeft,
  FaArrowRight,
  FaEllipsisV,
  FaBox,
  FaRegImage,
  FaSearch,
  FaChevronDown,
} from "react-icons/fa";

// Mock removed, using real data


// Mock removed, using real data
const categories = [
  "Uncategorized",
  "General",
  "Identification",
  "Internal",
  "External",
];

// ... (imports)
import useInspectionPhotoViewModel from "../../model/InspectionPart1";
import EditInspection from "./EditInspectionPart1";

export default function InspectionPhoto({ inspectionId, inspectionData }) {
  // If in Edit Mode
  if (inspectionId && inspectionData) {
    return (
      <EditInspection
        inspection={inspectionData}
        isEmbedded={true}
        onSubmit={() => { alert("Saved!"); /* Should reload? */ }}
        onClose={() => { }}
      />
    );
  }

  // ... (Create Mode Logic - Start of existing hook usage)
  const {
    // ... (destructuring)
  } = useInspectionPhotoViewModel();

  // ... (Rest of existing Create Mode Component)
  const sensors = useSensors(useSensor(PointerSensor));

  const categories = [
    "Uncategorized",
    "General",
    "Identification",
    "Internal",
    "External",
  ];


  const DraggablePhoto = ({ photo, parentUnit }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
      id: photo.id,
    });

    const style = transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px,0)` }
      : {};

    const availableCategories = categories.filter(
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
                     bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Draggable Handle (Image) */}
          <img
            src={photo.url}
            {...listeners}
            className="w-20 h-20 object-cover rounded cursor-move hover:opacity-90 transition border border-gray-600"
          />

          {/* Menu Actions */}
          <div className="ml-auto relative">
            <button
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(menuOpen === photo.id ? null : photo.id);
                setSubmenuOpen(false); // Reset submenu
              }}
            >
              <FaEllipsisV />
            </button>

            {menuOpen === photo.id && (
              <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 text-sm overflow-hidden text-blue-100">
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
                      className="w-full text-left px-4 py-3 hover:bg-gray-700 border-t border-gray-700 text-blue-100 transition"
                    >
                      Move to Category...
                    </button>

                    {submenuOpen && (
                      <div className="bg-gray-900 border-t border-gray-700">
                        {availableCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => assignCategory(photo.id, cat)}
                            className="w-full text-left px-6 py-2 hover:bg-gray-700 text-gray-300 text-xs transition"
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

          {/* Quick Category Buttons (Only in Uncategorized) */}
          {!parentUnit && activeTab === "Uncategorized" && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {categories.slice(1).map((catBtn) => (
                <button
                  key={catBtn}
                  onClick={() => assignCategory(photo.id, catBtn)}
                  className="px-3 py-1 text-xs font-medium bg-gray-700 text-blue-200 rounded-full 
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

  const DroppableUnit = ({ unit, index, totalUnits }) => {
    const { isOver, setNodeRef } = useDroppable({ id: unit.id });
    const { setNodeRef: setLineRef, isOver: isOverLine } = useDroppable({
      id: `line-${unit.id}`,
    });

    return (
      <div>
        {/* Drop Line Indicator */}
        <div
          ref={setLineRef}
          className={`h-2 rounded transition-colors ${isOverLine ? "bg-blue-500" : "bg-transparent"
            }`}
        />

        {/* Group Container */}
        <div
          ref={setNodeRef}
          className={`border p-4 rounded-lg shadow-sm transition-colors ${isOver ? "bg-gray-700 border-blue-500" : "bg-gray-800 border-gray-700"
            }`}
        >
          <div className="flex items-center mb-3 gap-2">
            <span className="font-bold text-blue-200">{index + 1}.0</span>
            <input
              type="text"
              placeholder="Add grouping title (optional)"
              value={unitTitles[unit.id] || ""}
              onChange={(e) =>
                setUnitTitles((prev) => ({
                  ...prev,
                  [unit.id]: e.target.value,
                }))
              }
              className="flex-1 p-2 bg-transparent border-b border-gray-600 focus:border-blue-500 outline-none text-blue-100 placeholder-gray-500 transition"
            />
          </div>

          <DraggablePhoto photo={unit} />
          {unit.group?.map((child) => (
            <DraggablePhoto key={child.id} photo={child} parentUnit={unit} />
          ))}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    // Changed: Page background to bg-gray-900 (Dark Mode)
    <div className="min-h-screen bg-gray-900 p-8 text-blue-100">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/dashboard/inspection")}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition font-medium"
          >
            <FaArrowLeft />
            Back
          </button>

          <h1 className="text-3xl font-bold text-blue-100">
            Inspection Photos
          </h1>

          <div className="w-24"></div>
        </div>

        {/* 1. Equipment Selection */}
        <div className="bg-gray-800 shadow-lg rounded-xl border border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-blue-200 mb-4 flex items-center gap-2">
            <FaBox className="text-gray-400" />
            Step 1: Select Equipment
          </h2>

          <div className="relative">
            {/* Searchable Input */}
            <div
              className="relative cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className={`w-full p-3 pl-4 pr-10 border border-gray-600 rounded-lg bg-gray-900 
                             focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 
                             text-blue-100 flex items-center justify-between`}>
                <span className={selectedEquipment ? "text-blue-100" : "text-gray-400"}>
                  {selectedEquipment || "-- Choose or Search Equipment --"}
                </span>
                <FaChevronDown className="text-gray-400 text-sm" />
              </div>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                {/* Search Bar inside Dropdown */}
                <div className="p-2 border-b border-gray-700 sticky top-0 bg-gray-800">
                  <div className="flex items-center bg-gray-900 rounded-md px-3 py-2 border border-gray-600">
                    <FaSearch className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search tag or name..."
                      className="bg-transparent outline-none text-blue-100 w-full placeholder-gray-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()} // Prevent closing
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredEquipment.length > 0 ? (
                    filteredEquipment.map((eq) => (
                      <div
                        key={eq.id}
                        onClick={() => {
                          setSelectedEquipment(eq.name);
                          setSelectedEquipmentId(eq.id); // Set the ID
                          setIsDropdownOpen(false);
                          setSearchTerm(""); // Reset search? Optional.
                        }}
                        className={`px-4 py-3 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors
                                                ${selectedEquipment === eq.name ? "bg-blue-900/50 text-blue-200" : "text-gray-300"}`}
                      >
                        {eq.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center text-sm">
                      No equipment found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Upload Section */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 mb-8 transition-all duration-300 ${selectedEquipment
            ? "bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700"
            : "bg-gray-800 border-gray-700 opacity-60 pointer-events-none"
            }`}
        >
          <div className="text-center">
            {selectedEquipment ? (
              <>
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600">
                  <FaCamera className="text-2xl text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-blue-100 mb-2">
                  Upload Photos for <span className="text-white">{selectedEquipment}</span>
                </h3>
                <p className="text-gray-400 mb-6">Drag and drop images here, or click to browse</p>

                <label className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg cursor-pointer hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform active:scale-95 inline-flex items-center gap-2">
                  <FaUpload /> Select Files
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <div className="py-6 text-gray-500">
                <FaRegImage className="mx-auto text-5xl mb-4 opacity-50" />
                <p className="font-medium">Please select an equipment above to start uploading.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Categorization & Sorting */}
        {selectedEquipment && (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === cat
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                    : "bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
                    }`}
                >
                  {cat}{" "}
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${activeTab === cat ? 'bg-blue-800 text-blue-100' : 'bg-gray-700 text-gray-300'}`}>
                    {photosByCategory[cat].length}
                  </span>
                </button>
              ))}
            </div>

            {/* Photo Workspace */}
            {activeTab === "Uncategorized" ? (
              <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-xl p-6 min-h-[300px]">
                {photosByCategory.Uncategorized.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                    <p>No uncategorized photos.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {photosByCategory.Uncategorized.map((photo) => (
                      <DraggablePhoto key={photo.id} photo={photo} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) =>
                  setDraggingPhoto(
                    photosByCategory[activeTab].find(
                      (p) => p.id === e.active.id
                    )
                  )
                }
                onDragEnd={handleDragEnd}
              >
                <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-xl p-6 min-h-[300px]">
                  {photosByCategory[activeTab].length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                      <p>Drag photos here from the Uncategorized tab</p>
                      <p className="text-sm mt-1">or use the photo menu to move them.</p>
                    </div>
                  ) : (
                    photosByCategory[activeTab].map((unit, idx) => (
                      <DroppableUnit
                        key={unit.id}
                        unit={unit}
                        index={idx}
                        totalUnits={photosByCategory[activeTab].length}
                      />
                    ))
                  )}
                </div>

                <DragOverlay>
                  {draggingPhoto && (
                    <img
                      src={draggingPhoto.url}
                      className="w-20 h-20 object-cover rounded-lg shadow-2xl opacity-90 ring-4 ring-slate-400"
                    />
                  )}
                </DragOverlay>
              </DndContext>
            )}

            {/* Footer / Next Step */}
            <div className="flex flex-col items-end mt-8 gap-3">
              {photosByCategory.Uncategorized.length > 0 && (
                <div className="bg-red-900/30 text-red-200 px-4 py-2 rounded-lg text-sm border border-red-800 font-medium">
                  ⚠ Please categorize all photos in the "Uncategorized" tab before proceeding.
                </div>
              )}

              <button
                onClick={handleNextStep}
                disabled={photosByCategory.Uncategorized.length > 0}
                className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-lg font-bold 
                           hover:bg-blue-700 shadow-md hover:shadow-lg disabled:bg-gray-600 disabled:shadow-none 
                           disabled:cursor-not-allowed transition-all"
              >
                Next Step <FaArrowRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}