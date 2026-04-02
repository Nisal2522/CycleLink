/**
 * components/admin/BankInfoModal.jsx
 * --------------------------------------------------
 * Modal showing partner's bank details (for admin payout list).
 * Props: partner (object with name, email, shopName, bankDetails), onClose.
 */

import { X } from "lucide-react";

export default function BankInfoModal({ partner, onClose }) {
  const bd = partner?.bankDetails || {};
  const hasAny =
    (bd.bankName || bd.branchName || bd.accountNo || bd.accountHolderName)?.trim?.();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Bank details</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {partner?.shopName || partner?.name || "—"}
          </p>
          {partner?.email && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{partner.email}</p>
          )}
          {hasAny ? (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Bank</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{bd.bankName || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Branch</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{bd.branchName || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Account number</dt>
                <dd className="font-mono font-medium text-slate-800 dark:text-slate-100">{bd.accountNo || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Account holder</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-100">{bd.accountHolderName || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No bank details provided yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
