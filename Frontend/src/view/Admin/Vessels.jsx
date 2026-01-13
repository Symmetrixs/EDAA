import React, { useState } from "react";
import { FaCogs, FaMapMarkerAlt, FaPlus, FaTrash, FaEdit, FaTimes } from "react-icons/fa";
import { useAdminVesselViewModel } from "../../model/Admin-Vessel";

export function Vessels() {
  const { vessels, loading, error, addVessel, updateVessel, deleteVessel, initialFormState } = useAdminVesselViewModel();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);

  const handleSave = async () => {
    if (!form.EquipDescription || !form.PlantName) {
      alert("Please fill in Description and Plant Name");
      return;
    }

    let success = false;
    if (editingId) {
      success = await updateVessel(editingId, form);
    } else {
      success = await addVessel(form);
    }

    if (success) {
      setIsModalOpen(false);
      setForm(initialFormState);
      setEditingId(null);
    }
  };

  const handleEdit = (vessel) => {
    setForm({
      EquipDescription: vessel.EquipDescription,
      EquipType: vessel.EquipType,
      TagNo: vessel.TagNo,
      PlantName: vessel.PlantName,
      DOSH: vessel.DOSH,
      Last_Inspection_Date: vessel.Last_Inspection_Date || "",
      Next_Inspection_Date: vessel.Next_Inspection_Date || ""
    });
    setEditingId(vessel.EquipID);
    setIsModalOpen(true);
  }

  const handleCreate = () => {
    setForm(initialFormState);
    setEditingId(null);
    setIsModalOpen(true);
  }

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this vessel?")) {
      await deleteVessel(id);
    }
  }

  return (
    <div className="p-8 text-blue-100 min-h-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Vessel Database</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition"
        >
          <FaPlus /> Add Vessel
        </button>
      </div>

      {loading && <p>Loading vessels...</p>}
      {error && <p className="text-red-400">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vessels.map((v) => (
          <div key={v.EquipID} className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-blue-500 transition group relative">

            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => handleEdit(v)}
                className="text-gray-500 hover:text-blue-500"
                title="Edit Vessel"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDelete(v.EquipID)}
                className="text-gray-500 hover:text-red-500"
                title="Delete Vessel"
              >
                <FaTrash />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              {v.Photo ? (
                <img
                  src={v.Photo}
                  alt={v.EquipDescription}
                  className="w-20 h-20 rounded-lg object-cover shadow-md shrink-0"
                />
              ) : (
                <div className="p-3 bg-blue-900/30 rounded-full text-blue-400 group-hover:text-blue-300 transition shrink-0">
                  <FaCogs className="text-2xl" />
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg text-white">{v.EquipDescription}</h3>
                <span className="text-xs text-blue-300 uppercase tracking-wide">{v.EquipType}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-400 mt-4 border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt />
                <span>{v.PlantName}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500">Tag No: </span>
                {v.TagNo}
              </div>
              <div>
                <span className="font-semibold text-gray-500">DOSH: </span>
                {v.DOSH}
              </div>
              <div className="flex justify-between pt-2">
                <div>
                  <span className="block text-xs text-gray-500">Last Insp:</span>
                  <span className="text-white">{v.Last_Inspection_Date || "-"}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-gray-500">Next Insp:</span>
                  <span className="text-yellow-400">{v.Next_Inspection_Date || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && vessels.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10 bg-gray-800 rounded-xl border border-dashed border-gray-700">
            No vessels found. Click "Add Vessel" to create one.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingId ? "Edit Vessel" : "Add New Vessel"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Equipment Name</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                    value={form.EquipDescription}
                    onChange={(e) => setForm({ ...form, EquipDescription: e.target.value })}
                    placeholder="e.g. Vessel Alpha"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Type</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                    value={form.EquipType}
                    onChange={(e) => setForm({ ...form, EquipType: e.target.value })}
                    placeholder="e.g. Pressure Vessel"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Plant / Location</label>
                <input
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                  value={form.PlantName}
                  onChange={(e) => setForm({ ...form, PlantName: e.target.value })}
                  placeholder="e.g. Offshore Plant 1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Tag No</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                    value={form.TagNo}
                    onChange={(e) => setForm({ ...form, TagNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">DOSH No</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                    value={form.DOSH}
                    onChange={(e) => setForm({ ...form, DOSH: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Last Inspection</label>
                  <input
                    type="date"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                    value={form.Last_Inspection_Date}
                    onChange={(e) => setForm({ ...form, Last_Inspection_Date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Next Inspection</label>
                  <input
                    type="date"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-blue-500"
                    value={form.Next_Inspection_Date}
                    onChange={(e) => setForm({ ...form, Next_Inspection_Date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition"
              >
                {loading ? "Saving..." : (editingId ? "Update Vessel" : "Create Vessel")}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
