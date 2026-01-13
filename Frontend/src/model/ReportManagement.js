import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function useReportManagementViewModel() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal / Edit States
    const [selectedReport, setSelectedReport] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // Edit Fields (Mapped to DB columns where possible)
    const [editComment, setEditComment] = useState("");


    const { user } = useAuth(); // Get user from context

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user?.id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Fetch Reports Created by Current User (New Endpoint)
            const reportRes = await api.get(`/report/inspector/${user.id}`);
            const reportData = reportRes.data;

            // 2. Fetch Inspections (to get Titles/ReportNos)
            // Optimization: Filter this too if possible, but fetching all is okay for title mapping 
            // OR simpler: Fetch only "My Inspections"
            const inspectionRes = await api.get(`/inspection/user/${user.id}`);
            const inspectionData = inspectionRes.data;
            const inspectionMap = {};
            inspectionData.forEach(i => {
                inspectionMap[i.InspectionID] = i;
            });

            // 3. Merge
            const merged = reportData.map(r => {
                const insp = inspectionMap[r.InspectionID];
                return {
                    ...r,
                    // UI mappings
                    id: r.InspectionID, // Report PK is InspectionID
                    title: insp ? insp.ReportNo : `Inspection #${r.InspectionID}`,
                    status: insp ? insp.Status : "Pending",
                    equipmentDesc: insp?.Equipment?.EquipDescription || "-",
                    description: r.Comment || "No comments",
                    content: r.Comment || "", // DB only has Comment. Real report content is generated.
                    wordUrl: insp?.Status === "Approved" && r.ApprovedWordFile ? r.ApprovedWordFile : r.WordFile,
                    pdfUrl: insp?.Status === "Approved" && r.ApprovedPdfFile ? r.ApprovedPdfFile : r.PdfFile,
                    date: insp?.InspectionDate || insp?.ReportDate || "-",
                    inspData: insp // Keep full data if needed
                };
            });

            // Sort by Date Descending
            merged.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (isNaN(dateA.getTime())) return 1;
                if (isNaN(dateB.getTime())) return -1;
                return dateB - dateA;
            });

            setReports(merged);
        } catch (err) {
            console.error(err);
            setError("Failed to load reports");
        } finally {
            setLoading(false);
        }
    };

    const openPreview = (report) => {
        setSelectedReport(report);
        setPreviewOpen(true);
    };

    const openEdit = (report) => {
        setSelectedReport(report);
        setEditComment(report.Comment || "");
        setEditOpen(true);
    };

    const saveEdit = async () => {
        if (!selectedReport) return;
        try {
            // Update Report Comment
            await api.put(`/report/${selectedReport.InspectionID}`, {
                Comment: editComment
            });

            alert("Report updated successfully");
            setEditOpen(false);
            fetchData(); // Refresh
        } catch (err) {
            console.error(err);
            alert("Failed to update report");
        }
    };

    const downloadPDF = (report) => {
        if (report.pdfUrl) {
            window.open(report.pdfUrl, "_blank");
        } else {
            alert("No PDF file uploaded for this report.");
        }
    };

    const downloadDOCX = (report) => {
        if (report.wordUrl) {
            window.open(report.wordUrl, "_blank");
        } else {
            alert("No Word file uploaded for this report.");
        }
    };

    return {
        reports,
        loading,
        error,
        selectedReport,
        previewOpen,
        setPreviewOpen,
        editOpen,
        setEditOpen,
        editComment,
        setEditComment,
        openPreview,
        openEdit,
        saveEdit,
        downloadPDF,
        downloadDOCX
    };
}
