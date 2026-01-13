import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import InspectorLayout from "./view/Inspector/InspectorLayout";
import AdminLayout from "./view/Admin/AdminLayout";
import Home from "./view/Inspector/Home";
import Profile from "./view/Inspector/Profile";
import InspectionPart1 from "./view/Inspector/InspectionPart1";
import InspectorSettings from "./view/Inspector/InspectorSettings";
import ReportManagement from "./view/Inspector/ReportManagement";
import TeamSharedReport from "./view/Inspector/TeamSharedReport";
import VesselManagement from "./view/Inspector/VesselManagement";
import AddEquipment from "./view/Inspector/AddEquipment";
import EditEquipment from "./view/Inspector/EditEquipment";
import InspectionManagement from "./view/Inspector/InspectionManagement";
import InspectionPart2 from "./view/Inspector/InspectionPart2";
import InspectionPart3 from "./view/Inspector/InspectionPart3";
import StatisticAnalysis from "./view/Inspector/StatisticAnalysis";


import { AdminDashboard } from "./view/Admin/Dashboard"; // ... existing


import { Users } from "./view/Admin/Users";
import { Reports } from "./view/Admin/Reports";
import { Vessels } from "./view/Admin/Vessels";
import { Analytics } from "./view/Admin/Analytics";
import { Settings } from "./view/Admin/Settings";
import { Notifications } from "./view/Admin/Notifications";

import { Login } from "./view/Auth/Login";
import { Register } from "./view/Auth/Register";
import { ForgotPassword } from "./view/Auth/ForgotPassword";
import { ResetPassword } from "./view/Auth/ResetPassword";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* --- AUTH AREA (LANDING) --- */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* --- INSPECTOR AREA --- */}
          <Route path="/dashboard" element={<InspectorLayout />}>
            <Route index element={<Home />} />
            <Route path="inspection-part1" element={<InspectionPart1 />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<InspectorSettings />} />
            <Route path="reportmanagement" element={<ReportManagement />} />
            <Route path="teamsharedreport" element={<TeamSharedReport />} />
            <Route path="vesselmanagement" element={<VesselManagement />} />
            <Route path="vesselmanagement/add" element={<AddEquipment />} />
            <Route path="vesselmanagement/edit" element={<EditEquipment />} />
            <Route path="inspection" element={<InspectionManagement />} />
            <Route path="inspection-part2/:inspectionId" element={<InspectionPart2 />} />
            <Route path="inspection-part3/:inspectionId" element={<InspectionPart3 />} />
            <Route path="statistics" element={<StatisticAnalysis />} />
          </Route>



          {/* --- ADMIN AREA --- */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="reports" element={<Reports />} />
            <Route path="vessels" element={<Vessels />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);