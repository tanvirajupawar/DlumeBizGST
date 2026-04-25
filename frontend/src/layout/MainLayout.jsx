import React, { useState } from "react";
import { HiOutlineSquares2X2 } from "react-icons/hi2";
import { ChevronDown } from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HiOutlineMail, HiOutlineDownload, HiOutlinePrinter } from "react-icons/hi";
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineUser,
  HiOutlineClipboardList,
} from "react-icons/hi";

import { HiOutlineBuildingOffice } from "react-icons/hi2";

/* Sidebar Navigation */

const navItems = [
  { label: "Home", icon: HiOutlineHome, path: "/dashboard" },

  {
    label: "Sales",
    icon: HiOutlineDocumentText,
    children: [
      { label: "Sales Invoices", path: "/sales-invoice-list" },
      { label: "Add Sale", path: "/sales-invoice" },
      { label: "Sales Return", path: "/sales-return" },
      { label: "Credit Note", path: "/credit-note" },
    ],
  },

  {
    label: "Purchase",
    icon: HiOutlineDocumentText,
    children: [
      { label: "Purchase Invoices", path: "/purchase-invoice-list" },
      { label: "Add Purchase", path: "/purchase-invoice" },
      { label: "Purchase Return", path: "/purchase-return-list" },
      { label: "Debit Note", path: "/debit-note" },
    ],
  },

  {
    label: "Items",
    icon: HiOutlineClipboardList,
    path: "/item-list",
  },

  {
    label: "Customers",
    icon: HiOutlineUser,
    path: "/customer-list",
  },

  {
    label: "Vendors",
    icon: HiOutlineUser,
    path: "/vendor-list",
  },

  {
    label: "My Stores",
    icon: HiOutlineBuildingOffice,
    path: "/stores",
  },

  {
    label: "Reports",
    icon: HiOutlineDocumentText,
    children: [
      {
        label: "Sales Reports",
        path: "/reports/sales",
      },
      {
        label: "Purchase Reports",
        path: "/reports",
      },
    ],
  },
];

const MainLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  const isRouteActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + "/")
    );
  };

  // Check if any child path is active (for parent dropdown highlight)
  const isChildActive = (children) => {
    return children?.some((child) =>
      child.children
        ? isChildActive(child.children)
        : location.pathname === child.path
    );
  };

  const pageTitles = {
    "/dashboard": {
      title: `Welcome back, ${user?.email?.split("@")[0] || "User"} 👋`,
      subtitle: "Here's your invoice overview.",
    },
    "/purchase-invoice": {
      title: "Add Stock / Purchase",
      subtitle: "Create a new purchase invoice.",
    },
    "/purchase-invoice-list": {
      title: "Purchase Invoices",
      subtitle: "View all purchase records.",
    },
    "/purchase-return-list": {
      title: "Purchase Return",
      subtitle: "Record a purchase return.",
    },
    "/debit-note": {
      title: "Debit Note",
      subtitle: "Create a new debit note.",
    },
    "/sales-invoice": {
      title: "Create Sales Invoice",
      subtitle: "Add a new sales invoice.",
    },
    "/sales-invoice-list": {
      title: "Sales Invoices",
      subtitle: "Manage your sales invoices.",
    },
    "/sales-return": {
      title: "Sales Return",
      subtitle: "Record a sales return.",
    },
    "/credit-note": {
      title: "Credit Note",
      subtitle: "Create a new credit note.",
    },
    "/item-list": {
      title: "Items",
      subtitle: "Manage your product inventory.",
    },
    "/customer-list": {
      title: "Customers",
      subtitle: "Manage your customers.",
    },
    "/vendor-list": {
      title: "Vendors",
      subtitle: "Manage your vendors.",
    },
    "/reports": {
      title: "Reports",
      subtitle: "View business reports and analytics.",
    },
    "/stock-summary": {
  title: "Stock Summary",
  subtitle: "View your full stock value breakdown.",
},

    "/reports/gstr2-purchase": {
      title: "Purchase Reports",
      subtitle: "View GST purchase report details.",
      actions: (
        <div className="flex gap-3">
          <button className="top-btn">
            <HiOutlineMail size={16} /> Email Excel
          </button>
          <button
            onClick={() => window.exportGSTR2Excel?.()}
            className="top-btn"
          >
            <HiOutlineDownload size={16} /> Download Excel
          </button>
          <button className="top-btn">
            <HiOutlinePrinter size={16} /> Print PDF
          </button>
        </div>
      ),
    },

    "/reports/purchase-summary": {
  title: "Purchase Summary",
  subtitle: "View purchase GST summary.",
  actions: (
    <div className="flex gap-3">
      <button className="top-btn">
        <HiOutlineMail size={16} /> Email Excel
      </button>

      <button
        onClick={() => window.exportPurchaseSummaryExcel?.()}
        className="top-btn"
      >
        <HiOutlineDownload size={16} /> Download Excel
      </button>

      <button className="top-btn">
        <HiOutlinePrinter size={16} /> Print PDF
      </button>
    </div>
  ),
},
  };

  const currentPage =
    pageTitles[location.pathname] || pageTitles["/dashboard"];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Logo — fixed, never scrolls */}
        <div className="flex-shrink-0 flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-[#1e3a8a]">
            <HiOutlineSquares2X2 size={20} />
          </div>
          <span className="font-semibold text-gray-800 text-base">
            D&apos;LumeBiz
          </span>
        </div>

        {/* Navigation — scrollable */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isDropdown = item.children;

            /* ---------- DROPDOWN MENU ---------- */
            if (isDropdown) {
              const isOpen = openMenu === item.label;
              const hasActiveChild = isChildActive(item.children);

              return (
                <div key={item.label}>
                  <button
                    onClick={() => setOpenMenu(isOpen ? null : item.label)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition
                    ${
                      hasActiveChild
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={19}
                        className={
                          hasActiveChild ? "text-blue-700" : "text-gray-400"
                        }
                      />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.children.map((child) => {
                        if (child.children) {
                          const isSubOpen = openSubMenu === child.label;
                          const hasActiveSubChild = isChildActive(child.children);

                          return (
                            <div key={child.label}>
                              <button
                                onClick={() =>
                                  setOpenSubMenu(isSubOpen ? null : child.label)
                                }
                                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded transition
                                ${
                                  hasActiveSubChild
                                    ? "text-blue-700 font-medium"
                                    : "text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                <span>{child.label}</span>
                                <ChevronDown
                                  size={14}
                                  className={`transition ${isSubOpen ? "rotate-180" : ""}`}
                                />
                              </button>

                              {isSubOpen && (
                                <div className="ml-4 mt-1 space-y-1">
                                  {child.children.map((sub) => (
                                    <NavLink
                                      key={sub.path}
                                      to={sub.path}
                                      className={({ isActive }) =>
                                        `block px-3 py-2 text-sm rounded transition ${
                                          isActive
                                            ? "text-blue-700 font-medium"
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`
                                      }
                                    >
                                      {sub.label}
                                    </NavLink>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `block px-3 py-2 text-sm rounded transition ${
                                isActive
                                  ? "text-blue-700 font-medium"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ---------- NORMAL MENU ---------- */
            const isActive = isRouteActive(item.path);

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon
                  size={19}
                  className={isActive ? "text-blue-600" : "text-gray-400"}
                />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 flex items-center justify-between px-8 py-3.5">
          <div>
            <p className="font-semibold text-gray-900 text-base leading-tight">
              {currentPage.title}
            </p>
            <p className="text-gray-400 text-sm">{currentPage.subtitle}</p>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">

  {/* ✅ STOCK SUMMARY PAGE */}
  {location.pathname === "/stock-summary" ? (
    <div className="flex gap-3">
      <button className="top-btn">
        <HiOutlineMail size={16} /> Email Excel
      </button>
      <button className="top-btn">
        <HiOutlineDownload size={16} /> Download Excel
      </button>
      <button className="top-btn">
        <HiOutlinePrinter size={16} /> Print PDF
      </button>
    </div>

  /* ✅ ITEMS PAGE */
  ) : location.pathname === "/item-list" ? (
    <button
      onClick={() => navigate("/stock-summary")}
      className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-indigo-200 bg-white shadow-sm hover:shadow-md transition min-w-[180px]"
    >
      <div className="flex flex-col text-left">
        <div className="flex items-center gap-1 text-xs font-medium text-indigo-500">
          ↑ Stock Value
        </div>
        <p className="text-base font-bold text-gray-900">
          ₹ 0
        </p>
      </div>
      <span className="text-indigo-400 text-sm">↗</span>
    </button>

  /* ✅ ALL OTHER PAGES (DEFAULT AVATAR) */
  ) : currentPage?.actions ? (
    currentPage.actions
  ) : (
    <div
      onClick={() => navigate("/profile")}
      className="flex items-center gap-3 cursor-pointer group"
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-[#1e3a8a]">
        {user?.email?.charAt(0)?.toUpperCase() || "U"}
      </div>

      <div className="flex flex-col">
        <p className="text-sm font-semibold text-gray-800 leading-tight">
          {user?.email?.split("@")[0] || "User"}
        </p>
        <p className="text-xs text-gray-400">
          {user?.email || "user@email.com"}
        </p>
      </div>

      <ChevronDown
        size={16}
        className="text-gray-400 group-hover:text-gray-600 transition"
      />
    </div>
  )}

</div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;