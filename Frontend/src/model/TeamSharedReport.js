import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function useTeamSharedReportViewModel() {
    const { user } = useAuth();

    // Data Loading
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Lists
    const [myInspections, setMyInspections] = useState([]); // Inspections created by me
    const [sharedInspections, setSharedInspections] = useState([]); // Inspections shared with me
    const [allInspectors, setAllInspectors] = useState([]); // Users to share with

    // UI State
    const [showMyReportModal, setShowMyReportModal] = useState(false);
    const [showUserSelect, setShowUserSelect] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchUser, setSearchUser] = useState("");


    useEffect(() => {
        if (user?.id) {
            initData();
        }
    }, [user?.id]);

    const initData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchMyInspections(),
                fetchSharedWithMe(),
                fetchInspectors()
            ]);
        } catch (err) {
            console.error("Init Error", err);
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    // 1. Fetch My Inspections (To share)
    const fetchMyInspections = async () => {
        try {
            const res = await api.get(`/inspection/user/${user.id}`);
            setMyInspections(res.data);
        } catch (err) {
            console.error("Fetch My Inspections Error", err);
        }
    };

    // 2. Fetch Shared With Me
    // Logic: Find teams I am in -> Get Inspection Details -> Get Report Files
    const fetchSharedWithMe = async () => {
        try {
            // New Endpoint from team.py
            const res = await api.get(`/team/shared/${user.id}`);

            // Map to UI format
            // Result is list of Inspections, each has "Report" property
            const mapped = res.data.map(insp => {
                let report = null;

                // Handle One-to-One vs One-to-Many return shape
                if (insp.Report) {
                    if (Array.isArray(insp.Report)) {
                        report = insp.Report.length > 0 ? insp.Report[0] : null;
                    } else {
                        // It's a single object (One-to-One connection)
                        report = insp.Report;
                    }
                }

                return {
                    id: insp.InspectionID, // Inspection ID
                    ReportNo: insp.ReportNo,
                    title: insp.ReportNo,
                    ReportDate: insp.ReportDate,
                    // If report exists, link files
                    pdfUrl: report ? report.PdfFile : null,
                    wordUrl: report ? report.WordFile : null,
                    // Extra info
                    hasReport: !!report
                };
            });

            setSharedInspections(mapped);
        } catch (err) {
            console.error("Fetch Shared Error", err);
        }
    };

    // 3. Fetch All Inspectors (To select who to share with)
    const fetchInspectors = async () => {
        try {
            const res = await api.get("/inspector/"); // Assuming this endpoint exists in inspector.py
            setAllInspectors(res.data);
        } catch (err) {
            console.error("Fetch Inspectors Error", err);
        }
    };

    // 4. Share Action
    const handleShare = async (inspectorId) => {
        if (!selectedReport) return;
        try {
            // a) Ensure Team exists for this inspection
            // Try create team (if exists, it returns existing)
            const teamRes = await api.post("/team/", {
                InspectionID: selectedReport.InspectionID
            });
            const teamId = teamRes.data.TeamID;

            // b) Add Member
            await api.post("/team/member", {
                TeamID: teamId,
                UserID: inspectorId
            });

            alert(`Successfully shared ${selectedReport.ReportNo} (Team #${teamId})`);
            setShowUserSelect(false);
            setShowMyReportModal(false);
        } catch (err) {
            console.error("Share Error", err);
            // Check if error is "User is already in this team"
            if (err.response?.status === 400 || err.response?.data?.detail?.includes("already")) {
                alert("User is already in the team for this report.");
            } else {
                alert("Failed to share report.");
            }
        }
    };

    // UI Helpers
    const handleShareClick = (report) => {
        setSelectedReport(report);
        setShowUserSelect(true);
    };

    const filteredUsers = allInspectors.filter((u) =>
        u.FullName.toLowerCase().includes(searchUser.toLowerCase())
    );

    return {
        loading,
        error,
        myInspections,
        sharedInspections,
        showMyReportModal,
        setShowMyReportModal,
        showUserSelect,
        setShowUserSelect,
        selectedReport,
        filteredUsers,
        searchUser,
        setSearchUser,
        handleShareClick,
        handleShare
    };
}
