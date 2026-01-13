import React, { useState, useEffect } from "react";
import { FaFileAlt, FaEye, FaDownload, FaTrash, FaCheck, FaTimes, FaSync, FaSave } from "react-icons/fa";
import { useAdminReportsViewModel } from "../../model/AdminReports";

export function Reports() {
  const { reports, loading, error, deleteReport, approveReport, revertReport, updateComment } = useAdminReportsViewModel();
  const [selectedReport, setSelectedReport] = useState(null);
  const [approvalFile, setApprovalFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Comment State
  const [commentText, setCommentText] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    if (selectedReport) {
      setCommentText(selectedReport.comment || "");
    }
  }, [selectedReport]);

  const handleSaveComment = async () => {
    if (!selectedReport) return;
    setSavingComment(true);
    const success = await updateComment(selectedReport.id, commentText);
    setSavingComment(false);
    if (success) {
      setSelectedReport(prev => ({ ...prev, comment: commentText }));
      alert("Comment saved successfully.");
    } else {
      alert("Failed to save comment.");
    }
  }

  const filteredReports = reports.filter(r =>
    (r.reportNo && r.reportNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.equipmentDesc && r.equipmentDesc.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.inspector && r.inspector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent row click
    if (confirm("Delete this report record?")) {
      await deleteReport(id);
      if (selectedReport?.id === id) setSelectedReport(null);
    }
  }



  const handleApprove = async () => {
    if (!selectedReport || !approvalFile) return alert("Please select a signed Word document (.docx) to upload.");

    if (confirm("Confirm approval? This will generate the final PDF.")) {
      setUploading(true);
      const success = await approveReport(selectedReport.id, approvalFile);
      setUploading(false);
      if (success) {
        setSelectedReport(prev => ({ ...prev, status: "Approved" }));
        setApprovalFile(null);
        alert("Report Approved Successfully!");
      } else {
        alert("Approval failed. Please try again.");
      }
    }
  }

  const handleRevert = async () => {
    if (confirm("Revert this report to 'Completed'? The approved files will be deleted.")) {
      const success = await revertReport(selectedReport.id);
      if (success) {
        setSelectedReport(prev => ({ ...prev, status: "Completed" }));
        alert("Report Reverted.");
      }
    }
  }

  return (
    <div className="p-8 text-blue-100 min-h-full relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          All Reports
        </h1>
        <input
          type="text"
          placeholder="Search report no, equipment, inspector..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-80 shadow-sm"
        />
      </div>

      {loading && <p>Loading reports...</p>}
      {error && <p className="text-red-400">{error}</p>}

      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Report No</th>
                <th className="px-6 py-4">Equipment</th>
                <th className="px-6 py-4">Inspector</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredReports.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className="hover:bg-gray-700/50 transition cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono text-blue-300 group-hover:text-blue-200 font-bold">{r.reportNo}</td>
                  <td className="px-6 py-4 text-gray-300 text-sm max-w-xs truncate" title={r.equipmentDesc}>{r.equipmentDesc}</td>
                  <td className="px-6 py-4 text-white text-sm">{r.inspector}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{r.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${r.status === "Approved" ? "bg-green-900/50 text-green-300 border border-green-700" :
                      r.status === "Completed" ? "bg-blue-900/50 text-blue-300 border border-blue-700" :
                        "bg-yellow-900/50 text-yellow-300 border border-yellow-700"
                      }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {/* Only Trash here, removed Approve. Download buttons kept for quick access? Or remove to force modal? Keeping trash for quick delete. */}
                    <button
                      onClick={(e) => handleDelete(e, r.id)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-400 hover:text-red-400 transition"
                      title="Delete Record"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredReports.length === 0 && (
                <tr><td colSpan="6" className="p-6 text-center text-gray-500">No reports found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REPORT PREVIEW MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-gray-800 w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">

            {/* Header (Spans full width) */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 bg-gray-900 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                {selectedReport.reportNo}
                <span className={`text-xs px-2 py-1 rounded border uppercase tracking-wider font-semibold ${selectedReport.status === "Approved" ? "bg-green-900 text-green-300 border-green-600" : "bg-blue-900 text-blue-300 border-blue-600"
                  }`}>
                  {selectedReport.status}
                </span>
              </h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>

            {/* Split Body */}
            <div className="flex-1 flex overflow-hidden">

              {/* LEFT: PDF Preview (70%) */}
              <div className="flex-[7] bg-black relative border-r border-gray-700">
                {(selectedReport.status === "Approved" && selectedReport.approvedPdfFile) || selectedReport.pdfFile ? (
                  <iframe
                    src={selectedReport.status === "Approved" && selectedReport.approvedPdfFile ? selectedReport.approvedPdfFile : selectedReport.pdfFile}
                    className="w-full h-full border-none"
                    title="Report PDF"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FaFileAlt className="text-6xl mb-4 opacity-30" />
                    <p>No PDF Generated</p>
                  </div>
                )}
              </div>

              {/* RIGHT: Workflow & Actions (30%) */}
              <div className="flex-[3] bg-gray-800 p-6 overflow-y-auto flex flex-col">


                {/* Workflow Section */}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    Approval Process
                  </h3>

                  {selectedReport.status === "Approved" ? (
                    <div className="bg-green-900/20 border border-green-800 p-4 rounded-xl text-center">
                      <FaCheck className="text-4xl text-green-500 mx-auto mb-2" />
                      <p className="text-green-300 font-semibold">Report Approved</p>
                      <p className="text-xs text-green-400/70 mt-1">The signed document has been uploaded.</p>

                      {selectedReport.wordFile && (
                        <div className="mt-4 pt-4 border-t border-green-800/50">
                          <a href={selectedReport.wordFile} className="text-xs text-green-400 underline hover:text-white">Download Original Word</a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6 relative">
                      {/* Step 1 */}
                      <div className="relative pl-6 border-l-2 border-gray-700 pb-2">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-gray-800"></div>
                        <h4 className="text-sm font-bold text-blue-300 mb-2">Step 1: Download & Sign</h4>
                        <p className="text-xs text-gray-400 mb-3">Download the generated report, review it, and add your signature/stamp locally.</p>

                        {selectedReport.wordFile ? (
                          <a
                            href={selectedReport.wordFile}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition border border-blue-500 shadow-lg shadow-blue-900/20"
                          >
                            <FaDownload /> Download (.docx)
                          </a>
                        ) : (
                          <span className="text-xs text-red-400">Word file missing</span>
                        )}
                      </div>

                      {/* Step 2 */}
                      <div className="relative pl-6 border-l-2 border-gray-700">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-gray-600 border-2 border-gray-800"></div>
                        <h4 className="text-sm font-bold text-blue-300 mb-2">Step 2: Upload Signed File</h4>
                        <p className="text-xs text-gray-400 mb-3">Upload the signed .docx file to finalize approval.</p>

                        <div className="bg-gray-900/50 p-3 rounded-lg border border-dashed border-gray-600 hover:border-blue-500 transition">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={(e) => setApprovalFile(e.target.files[0])}
                            className="block w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-900 file:text-blue-300 hover:file:bg-blue-800 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Comment Section */}
                <div className="my-6 pt-6 border-t border-gray-700">
                  <label className="block text-sm font-bold text-blue-300 mb-2">Comments</label>
                  <textarea
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-gray-200 focus:border-blue-500 outline-none text-sm resize-none"
                    rows="3"
                    placeholder="Enter remarks or approval notes..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSaveComment}
                      disabled={savingComment}
                      className="text-xs bg-blue-600 px-3 py-1.5 rounded-lg text-white flex items-center gap-2 hover:bg-blue-500 transition shadow-lg shadow-blue-900/20"
                    >
                      <FaSave /> {savingComment ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-8 pt-6 border-t border-gray-700">
                  {selectedReport.status === "Approved" ? (
                    <button
                      onClick={handleRevert}
                      className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-300 py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition"
                    >
                      <FaTimes /> Revert Approval
                    </button>
                  ) : (
                    <button
                      onClick={handleApprove}
                      disabled={!approvalFile || uploading}
                      className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition shadow-lg 
                                ${!approvalFile || uploading ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-green-900/30"}`}
                    >
                      {uploading ? <FaSync className="animate-spin text-lg" /> : <FaCheck className="text-lg" />}
                      {uploading ? "Processing..." : "Approve & Upload"}
                    </button>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
