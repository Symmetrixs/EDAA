import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useProfileViewModel } from "../../model/Profile";
import { useInspectorStatsViewModel } from "../../model/InspectorStats";
import {
  FaBuilding,
  FaClipboardCheck,
  FaFileAlt,
  FaUsers,
  FaChartBar,
  FaArrowRight,
  FaExclamationCircle,
  FaCheckCircle,
  FaTools
} from "react-icons/fa";

export default function Home() {
  const { user } = useAuth();

  const {
    fullName,
    phoneNo,
    address,
    loading: profileLoading
  } = useProfileViewModel();

  const { stats } = useInspectorStatsViewModel();

  const [isProfileComplete, setIsProfileComplete] = useState(true);

  useEffect(() => {
    // Check if key fields are potentially empty/default
    if (!profileLoading) {
      if (!fullName || !phoneNo || !address) {
        setIsProfileComplete(false);
      } else {
        setIsProfileComplete(true);
      }
    }
  }, [fullName, phoneNo, address, profileLoading]);

  const cards = [
    {
      title: "Vessel Management",
      desc: "Manage fleet equipment, plants, and vessel details.",
      icon: <FaBuilding className="text-4xl text-purple-400" />,
      link: "/dashboard/vesselmanagement",
      color: "border-purple-500/30 hover:border-purple-500"
    },
    {
      title: "Inspection Management",
      desc: "Create new inspections or continue existing drafts.",
      icon: <FaClipboardCheck className="text-4xl text-blue-400" />,
      link: "/dashboard/inspection",
      color: "border-blue-500/30 hover:border-blue-500"
    },
    {
      title: "Report Management",
      desc: "Generate PDF reports and review finalized documents.",
      icon: <FaFileAlt className="text-4xl text-green-400" />,
      link: "/dashboard/reportmanagement",
      color: "border-green-500/30 hover:border-green-500"
    },
    {
      title: "Team Shared Files",
      desc: "Access and collaborate on shared team resources.",
      icon: <FaUsers className="text-4xl text-orange-400" />,
      link: "/dashboard/teamsharedreport",
      color: "border-orange-500/30 hover:border-orange-500"
    },
    {
      title: "Statistic Analysis",
      desc: "Visualize defect trends and inspection performance.",
      icon: <FaChartBar className="text-4xl text-pink-400" />,
      link: "/dashboard/statistics",
      color: "border-pink-500/30 hover:border-pink-500"
    },
    {
      title: "Account Setting",
      desc: "Edit or Update your account details.",
      icon: <FaTools className="text-4xl text-yellow-400" />,
      link: "/dashboard/settings",
      color: "border-yellow-500/30 hover:border-yellow-500"
    },
  ];

  return (
    <div className="p-8 text-blue-100 min-h-full">
      {/* Welcome Section */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Welcome back, {user?.name || "Inspector"}!
        </h1>
        <p className="text-gray-400 text-lg">
          Here is an overview of your inspection activities.
        </p>
      </header>

      {/* Profile Alert - Only show if incomplete */}
      {!profileLoading && !isProfileComplete && (
        <div className="mb-10 bg-yellow-900/20 border border-yellow-700/50 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-900/40 rounded-full">
              <FaExclamationCircle className="text-2xl text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-100">Complete Your Profile</h3>
              <p className="text-yellow-200/70 mt-1">
                Your profile is missing contact details (Phone, Address). Update it to ensure reports have accurate inspector info.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/profile"
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold rounded-lg shadow-lg transition whitespace-nowrap"
          >
            Update Profile
          </Link>
        </div>
      )}

      {/* Quick Stats - Inspector Overview */}
      <div className="mb-10 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
          My Performance
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-yellow-500/50 transition">
            <div className="text-2xl font-bold text-white">{stats.pendingReports}</div>
            <div className="text-xs text-gray-400 mt-1">Pending Reports</div>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-green-500/50 transition">
            <div className="text-2xl font-bold text-white">{stats.completedReports}</div>
            <div className="text-xs text-gray-400 mt-1">Completed Reports</div>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-blue-500/50 transition">
            <div className="text-2xl font-bold text-white">{stats.totalInspections}</div>
            <div className="text-xs text-gray-400 mt-1">All Inspections</div>
          </div>
        </div>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            className={`group bg-gray-800 rounded-2xl p-8 border ${card.color} transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between`}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-gray-900 rounded-xl shadow-inner">
                  {card.icon}
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                  <FaArrowRight className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {card.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
