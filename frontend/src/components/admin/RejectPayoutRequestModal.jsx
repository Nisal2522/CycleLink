/**
 * components/admin/RejectPayoutRequestModal.jsx
 * --------------------------------------------------
 * Modal to enter rejection reason for a payout request (Requirement b).
 * Props: requestId, partnerName, amount, onClose, onConfirm(rejectionReason), loading.
 */

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export default function RejectPayoutRequestModal({
  requestId,
  partnerName,
  amount,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a reason for rejection.");
      return;
    }
    if (trimmed.length > 500) {
      setError("Reason must be 500 characters or less.");
      return;
    }
    setError("");
    onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Reject payout request</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {partnerName && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Partner: <span className="font-medium">{partnerName}</span>
              {amount != null && (
                <> · <span className="font-medium">{Number(amount).toLocaleString()} LKR</span></>
              )}
            </p>
            )}
          <div>
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason for rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejectionReason"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
              placeholder="e.g. Invalid account details provided"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">{reason.length}/500</p>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Reject request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
