
import React from "react";
import { useParams } from "react-router-dom";
import useInspectionPart3ViewModel from "../../model/InspectionPart3";
import api from "../../api/axios";

export default function InspectionPart3({ inspectionId: propId }) {
    const { inspectionId: paramId } = useParams();
    const effectiveId = propId || paramId;
    const {
        formData,
        loading,
        handleChange,
        handleSubmit,
        generateAndUploadReport,
        navigate
    } = useInspectionPart3ViewModel(effectiveId);

    const [isSaved, setIsSaved] = React.useState(false);
    const [genLoading, setGenLoading] = React.useState(false);
    const [genError, setGenError] = React.useState("");
    const [pdfUrl, setPdfUrl] = React.useState("");
    const [docxUrl, setDocxUrl] = React.useState("");

    const handleSave = async () => {
        const success = await handleSubmit();
        if (success) {
            setIsSaved(true);
        }
    };

    const handleGenerate = async () => {
        try {
            setGenError("");
            setPdfUrl("");
            setGenLoading(true);

            // Use Client-Side Generation
            const result = await generateAndUploadReport();

            if (result && result.docx) {
                setPdfUrl(result.pdf || ""); // Keep using pdfUrl variable for PDF
                setDocxUrl(result.docx);     // Add new variable
            } else {
                setGenError("Report generated but URL missing");
            }
        } catch (e) {
            console.error(e);
            setGenError(e.message || "Failed to generate report");
        } finally {
            setGenLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-white">Loading...</div>;
    }

    return (
        <div className={`text-blue-100 min-h-screen bg-gray-900 ${propId ? 'p-0' : 'p-8'} relative`}>
            {!propId && (
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Inspection Final Report (Part 3)</h1>
                    <button
                        onClick={() => navigate("/dashboard/inspection")}
                        className="text-gray-400 hover:text-white"
                    >
                        Back to List
                    </button>
                </div>
            )}

            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-8 max-w-4xl mx-auto space-y-6">

                {/* Findings */}
                <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Findings / Defect Description</label>
                    <textarea
                        name="Findings"
                        value={formData.Findings}
                        onChange={handleChange}
                        className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-blue-100 focus:border-blue-500 outline-none resize-y"
                        placeholder="Detailed findings..."
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Post Final Inspection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">Post Final Inspection</label>
                        <textarea
                            name="Post_Final_Inspection"
                            value={formData.Post_Final_Inspection}
                            onChange={handleChange}
                            className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-blue-100 focus:border-blue-500 outline-none resize-none"
                            placeholder="Inspection notes..."
                        />
                    </div>
                </div>

                {/* NDTs */}
                <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Non-Destructive Testing (NDTs)</label>
                    <textarea
                        name="NDTs"
                        value={formData.NDTs}
                        onChange={handleChange}
                        className="w-full h-24 bg-gray-900 border border-gray-600 rounded-lg p-3 text-blue-100 focus:border-blue-500 outline-none resize-y"
                        placeholder="NDT results or requirements..."
                    />
                </div>

                {/* Recommendations */}
                <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Recommendations / Remedial Action</label>
                    <textarea
                        name="Recommendations"
                        value={formData.Recommendations}
                        onChange={handleChange}
                        className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-blue-100 focus:border-green-500 outline-none resize-y"
                        placeholder="Recommended actions..."
                    />
                </div>

                {/* Submit Logic */}
                <div className="flex justify-end pt-4 border-t border-gray-700">
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-transform active:scale-95"
                    >
                        Save Final Report
                    </button>
                </div>
            </div>

            {/* Start Generation Popout/Modal */}
            {isSaved && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl max-w-md w-full text-center relative animate-fade-in-up">
                        <button
                            onClick={() => setIsSaved(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">
                            {docxUrl ? "Report Generated Successfully!" : "Report Saved Successfully!"}
                        </h3>
                        <p className="text-gray-400 mb-8">
                            {docxUrl ? "The official document has been generated." : "The inspection data has been secured. You can now proceed to generate the official document."}
                        </p>

                        {!docxUrl && (
                            <button
                                onClick={handleGenerate}
                                disabled={genLoading}
                                className={`w-full py-3.5 ${genLoading ? 'bg-blue-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white font-bold rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {genLoading ? 'Generating…' : 'Start Report Generation'}
                            </button>
                        )}

                        {genError && (
                            <p className="text-red-400 mt-3 text-sm">{genError}</p>
                        )}

                        {docxUrl && (
                            <div className="flex gap-3 w-full">
                                <a
                                    href={docxUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Word (DOCX)
                                </a>

                                {pdfUrl ? (
                                    <a
                                        href={pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        PDF
                                    </a>
                                ) : (
                                    <button disabled className="flex-1 py-3.5 bg-gray-600 text-gray-400 font-bold rounded-xl cursor-not-allowed">
                                        PDF (Processing...)
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => navigate("/dashboard")}
                            className="mt-4 text-gray-500 hover:text-gray-300 text-sm font-medium"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
