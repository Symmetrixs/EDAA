import { useState, useEffect } from "react";
import api from "../api/axios";

export function useAdminReportsViewModel() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [reportsRes, inspectionsRes] = await Promise.all([
                api.get("/report/"),
                api.get("/inspection/")
            ]);

            const rawReports = reportsRes.data;
            const inspections = inspectionsRes.data;

            console.log("Inspections Data:", inspections); // Debug

            const formatted = rawReports.map(r => {
                const insp = inspections.find(i => i.InspectionID === r.InspectionID) || r.Inspection || {};

                return {
                    id: r.InspectionID,
                    reportNo: insp.ReportNo || r.Inspection?.ReportNo || "N/A",
                    equipmentDesc: insp.Equipment?.EquipDescription || insp.EquipDescription || r.Inspection?.Equipment?.EquipDescription || "-",
                    inspector: insp.Inspector?.FullName || r.Inspection?.Inspector?.FullName || "Unknown",
                    date: insp.ReportDate || r.Inspection?.ReportDate || "-",
                    status: insp.Status || r.Inspection?.Status || "Pending",
                    findings: insp.Findings || r.Inspection?.Findings || "-",
                    recommendations: insp.Recommendations || r.Inspection?.Recommendations || "-",
                    ndts: insp.NDTs || r.Inspection?.NDTs || "-",
                    postFinal: insp.Post_Final_Inspection || r.Inspection?.Post_Final_Inspection || "-",
                    wordFile: r.WordFile,
                    pdfFile: r.PdfFile,
                    approvedPdfFile: r.ApprovedPdfFile,
                    comment: r.Comment || ""
                };
            });


            setReports(formatted);
            setError("");
        } catch (err) {
            console.error("Fetch Reports Error:", err);
            setError("Failed to load reports.");
        } finally {
            setLoading(false);
        }
    };

    const deleteReport = async (inspectionId) => {
        try {
            await api.delete(`/report/${inspectionId}`);
            setReports(prev => prev.filter(r => r.id !== inspectionId));
            return true;
        } catch (err) {
            console.error("Delete Report Error:", err);
            return false;
        }
    }

    const updateComment = async (inspectionId, comment) => {
        try {
            await api.put(`/report/${inspectionId}`, { Comment: comment });
            setReports(prev => prev.map(r =>
                r.id === inspectionId ? { ...r, comment } : r
            ));
            return true;
        } catch (err) {
            console.error("Update Comment Error:", err);
            return false;
        }
    }

    const approveReport = async (inspectionId, file) => {
        try {
            if (!file) throw new Error("File is required for approval");

            const formData = new FormData();
            formData.append("file", file);

            await api.post(`/report/${inspectionId}/approve-upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            // Refresh reports to get the updated ApprovedPdfFile URL
            await fetchReports();
            return true;
        } catch (err) {
            console.error("Approve Report Error:", err);
            const msg = err.response?.data?.detail || err.message || "Unknown error";
            alert(`Approval Failed: ${msg}`);
            return false;
        }
    }

    const revertReport = async (inspectionId) => {
        try {
            await api.put(`/report/${inspectionId}/revert-approval`);
            setReports(prev => prev.map(r =>
                r.id === inspectionId ? { ...r, status: "Completed" } : r
            ));
            return true;
        } catch (err) {
            console.error("Revert Report Error:", err);
            return false;
        }
    }

    useEffect(() => {
        fetchReports();
    }, []);

    return {
        reports,
        loading,
        error,
        deleteReport,
        approveReport,
        revertReport,
        updateComment,
        refresh: fetchReports
    };
}
