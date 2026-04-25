import { useState } from "react";
import { FiStar } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const reportSections = [
  {
    title: "GST",
  reports: [
  "GSTR-2 (Purchase)",
  "Purchase Summary",  
],
  },
];

const Reports = () => {

  const navigate = useNavigate();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-semibold text-gray-800">Reports</h1>
      </div>

      {/* Reports Container */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-3 gap-8">

        {reportSections.map((section) => (
          <div key={section.title} className="space-y-4">

            {/* Section Title */}
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              {section.title}
            </div>

            {/* Reports */}
            <div className="space-y-3">
              {section.reports.map((report) => (
                <div
                  key={report}
                 onClick={() => {
  if (report === "Purchase Summary") {
    navigate("/reports/purchase-summary");
  }

  if (report === "GSTR-2 (Purchase)") {
    navigate("/reports/gstr2-purchase");
  }
}}
                  className="flex items-center justify-between text-sm text-gray-700 hover:text-blue-600 cursor-pointer"
                >
                  {report}

                  {section.title === "Favourite" && (
                    <FiStar className="text-yellow-400" size={16} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>

    </div>
  );
};

export default Reports;