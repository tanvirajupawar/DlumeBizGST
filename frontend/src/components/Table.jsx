import { FiSearch, FiTrash2 } from "react-icons/fi";
import { useState } from "react";

const Table = ({
  columns = [],
  data = [],
  onRowClick,
  onDelete,
  renderActions,
  searchPlaceholder = "Search...",
  headerActions,
}) => {

  // ✅ state must be INSIDE component
  const [search, setSearch] = useState("");

  // ✅ filter logic
  const filteredData = data.filter((row) => {
    return columns.some((col) => {
      const value = row[col.key];
      return value
        ?.toString()
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* Search */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">

        <div className="relative w-1/2">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {headerActions}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="text-left px-6 py-3">
                {col.label}
              </th>
            ))}

            {(renderActions || onDelete) && (
              <th className="text-left px-6 py-3">Actions</th>
            )}
          </tr>
        </thead>

        <tbody>
          {filteredData.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-6 text-gray-400"
              >
                No data found
              </td>
            </tr>
          )}

          {filteredData.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick && onRowClick(row)}
              className="border-t border-gray-100 hover:bg-gray-50 transition cursor-pointer"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-gray-700">
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key]}
                </td>
              ))}

              {(renderActions || onDelete) && (
                <td
                  className="px-6 py-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">

                    {renderActions && renderActions(row)}

                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}

                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;