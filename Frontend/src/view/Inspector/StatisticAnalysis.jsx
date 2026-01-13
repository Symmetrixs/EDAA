import React from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import useStatisticAnalysisViewModel from "../../model/StatisticAnalysis";

export default function StatisticAnalysis() {
    const {
        loading,
        error,
        inspectionSummary,
        inspectionsByType,
        monthlyTrend
    } = useStatisticAnalysisViewModel();

    const COLORS = [
        "#60a5fa", // blue-400
        "#3b82f6", // blue-500
        "#93c5fd", // blue-300
        "#818cf8", // indigo-400
        "#a5b4fc", // indigo-300
    ];

    const tooltipStyle = {
        backgroundColor: '#1f2937', // gray-800
        borderColor: '#4b5563',     // gray-600
        color: '#bfdbfe',           // blue-200
        borderRadius: '8px'
    };

    if (loading) return <div className="p-8 text-white">Loading statistics...</div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

    return (
        // 1. Page Background: bg-gray-700
        <div className="p-8 bg-gray-700 min-h-screen">

            <h1 className="text-3xl font-bold text-blue-100 mb-6">
                Inspection Statistics & Analysis
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Card Background: bg-gray-800, Border: border-gray-600 */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-600">
                    <h2 className="text-lg font-medium text-blue-200 mb-2">Total Completed</h2>
                    <p className="text-4xl font-bold text-blue-400">
                        {inspectionSummary.completed}
                    </p>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-600">
                    <h2 className="text-lg font-medium text-blue-200 mb-2">Total Pending</h2>
                    <p className="text-4xl font-bold text-yellow-400">
                        {inspectionSummary.pending}
                    </p>
                </div>
            </div>

            {/* Inspection by Category */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-600 mb-10">
                <h2 className="text-xl font-semibold text-blue-100 mb-6">
                    Inspection Count by Equipment Type
                </h2>

                <div className="flex flex-col lg:flex-row gap-10 justify-center items-center">
                    {/* Bar Chart */}
                    <div className="w-full lg:w-1/2 flex justify-center">
                        <BarChart width={500} height={300} data={inspectionsByType}>
                            {/* Grid lines lighter for dark mode */}
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            {/* Axes text color lighter */}
                            <XAxis dataKey="type" stroke="#9ca3af" fontSize={12} tickLine={false} />
                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#374151' }} />
                            <Legend wrapperStyle={{ color: '#bfdbfe' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Inspections" />
                        </BarChart>
                    </div>

                    {/* Pie Chart */}
                    <div className="w-full lg:w-1/2 flex justify-center">
                        <PieChart width={350} height={300}>
                            <Pie
                                data={inspectionsByType}
                                dataKey="count"
                                nameKey="type"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                labelLine={false}
                                stroke="#1f2937" // Border of pie slices matches bg
                            >
                                {inspectionsByType.map((entry, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
                        </PieChart>
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-600 mb-10">
                <h2 className="text-xl font-semibold text-blue-100 mb-6">
                    Monthly Inspection Trend
                </h2>

                <div className="flex justify-center">
                    <LineChart
                        width={900}
                        height={350}
                        data={monthlyTrend}
                        className="mx-auto"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#60a5fa" // Lighter blue for visibility
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#60a5fa' }}
                            activeDot={{ r: 6 }}
                            name="Inspections Completed"
                        />
                    </LineChart>
                </div>
            </div>
        </div>
    );
}

