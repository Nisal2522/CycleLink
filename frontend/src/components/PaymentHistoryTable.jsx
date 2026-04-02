/**
 * components/PaymentHistoryTable.jsx
 * --------------------------------------------------
 * Reusable Payment History table: filters, pagination, export, loading, empty state.
 * Read-only (CRUD: Read). Create/Update/Delete are admin-side.
 *
 * Props:
 *   - payouts     : Array<{ _id, month, totalTokens, totalAmount, status, transactionId?, source?: 'payout_request' }>
 *   - loading     : boolean
 *   - emptyTitle  : string (optional)
 *   - emptyDesc   : string (optional)
 *   - accentColor : string (optional)
 *   - className   : string (optional)
 *   - showFilters : boolean (default true) — show filter bar
 *   - pageSizeOptions : number[] (default [5, 10, 25])
 * --------------------------------------------------
 */

import { useState, useMemo } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Receipt,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle,
} from "lucide-react";

const DEFAULT_ACCENT = "#80134D";

function formatMonth(monthStr) {
  if (!monthStr || monthStr.length < 7) return monthStr;
  const [y, mo] = monthStr.split("-");
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

function monthToLabel(monthStr) {
  if (!monthStr || monthStr.length < 7) return monthStr;
  return formatMonth(monthStr);
}

/** Build and trigger CSV download from filtered payouts */
function exportToCsv(payouts, formatMonthFn) {
  const headers = ["Month", "Tokens Redeemed", "Amount (LKR)", "Status", "Transaction ID"];
  const rows = payouts.map((p) => [
    formatMonthFn(p.month),
    p.source === "payout_request" ? "—" : String(p.totalTokens ?? ""),
    String(p.totalAmount ?? ""),
    p.status ?? "",
    p.transactionId ?? "",
  ]);
  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PaymentHistoryTable({
  payouts = [],
  loading = false,
  emptyTitle = "No payments yet",
  emptyDesc = "Your monthly payouts will appear here once processed by the admin.",
  accentColor = DEFAULT_ACCENT,
  className = "",
  showFilters = true,
  pageSizeOptions = [5, 10, 25],
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);

  const monthOptions = useMemo(() => {
    const set = new Set();
    payouts.forEach((p) => {
      if (p.month) set.add(p.month);
    });
    return Array.from(set).sort().reverse();
  }, [payouts]);

  const filtered = useMemo(() => {
    let list = payouts;
    if (statusFilter !== "all") {
      list = list.filter((p) => (p.status || "").toLowerCase() === statusFilter.toLowerCase());
    }
    if (monthFilter) {
      list = list.filter((p) => p.month === monthFilter);
    }
    return list;
  }, [payouts, statusFilter, monthFilter]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handlePageSizeChange = (e) => {
    const v = Number(e.target.value);
    if (!Number.isNaN(v) && v > 0) {
      setPageSize(v);
      setPage(1);
    }
  };

  const showTable = !loading && payouts.length > 0;

  return (
    <div
      className={`w-full bg-white dark:bg-slate-800 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.05)] border-t border-white/30 dark:border-slate-700/50 overflow-hidden ${className}`}
    >
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Receipt className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Payment History</h2>
        </div>
        {showTable && showFilters && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthToLabel(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => exportToCsv(filtered, formatMonth)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] py-20">
          <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: accentColor }} />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading payments...</p>
        </div>
      ) : payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] py-20 text-center px-6 w-full">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-5">
            <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{emptyTitle}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-sm">{emptyDesc}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Tokens Redeemed</th>
                  <th className="px-4 py-3">Amount (LKR)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No payments match your filters.
                    </td>
                  </tr>
                ) : (
                paginated.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {formatMonth(p.month)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {p.source === "payout_request" ? "—" : (p.totalTokens ?? "—")}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: accentColor }}>
                      {p.totalAmount != null ? p.totalAmount.toLocaleString() : "—"} LKR
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "Paid" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Paid
                        </span>
                      ) : p.status === "Rejected" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[140px]"
                      title={p.transactionId}
                    >
                      {p.status === "Paid" && p.transactionId ? p.transactionId : "—"}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>

          {showFilters && payouts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span>
                  {totalFiltered === 0
                    ? "Showing 0 of 0"
                    : `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalFiltered)} of ${totalFiltered}`}
                </span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 text-xs"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} per page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-600"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
