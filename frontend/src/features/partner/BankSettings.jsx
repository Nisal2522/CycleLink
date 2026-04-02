/**
 * features/partner/BankSettings.jsx
 * --------------------------------------------------
 * Partner Bank Details CRUD: View (static) / Edit (Formik+Yup), Delete with confirmation modal.
 * All API calls via partnerService (axiosClient + JWT). Success toast on View, Update, Delete (Requirement iv).
 */

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import {
  Building2,
  Loader2,
  Save,
  Pencil,
  Trash2,
  Landmark,
  MapPin,
  Hash,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { getBankDetails, updateBankDetails, deleteBankDetails } from "../../services/partnerService";

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const bankDetailsSchema = Yup.object({
  bankName: Yup.string().trim().required("Bank name is required").max(100),
  branchName: Yup.string().trim().required("Branch name is required").max(100),
  accountNo: Yup.string()
    .trim()
    .required("Account number is required")
    .min(5)
    .max(40)
    .matches(/^[A-Za-z0-9\-.\s]+$/, "Account number can only contain digits, letters, hyphens, and spaces"),
  accountHolderName: Yup.string().trim().required("Account holder name is required").max(100),
});

const emptyBankDetails = {
  bankName: "",
  branchName: "",
  accountNo: "",
  accountHolderName: "",
};

function hasAnyBankDetails(bd) {
  return [bd?.bankName, bd?.branchName, bd?.accountNo, bd?.accountHolderName].some((v) => v && String(v).trim());
}

export default function BankSettings() {
  const { token } = useAuth();
  const [bankDetails, setBankDetails] = useState(emptyBankDetails);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formik = useFormik({
    initialValues: { ...emptyBankDetails },
    validationSchema: bankDetailsSchema,
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!token) return;
      setSaving(true);
      try {
        const result = await updateBankDetails(token, values);
        setBankDetails(result?.bankDetails ?? emptyBankDetails);
        setIsEditing(false);
        toast.success("Bank details updated successfully.");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to save bank details.");
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getBankDetails(token)
      .then((data) => {
        if (!cancelled) {
          const bd = data?.bankDetails ?? emptyBankDetails;
          setBankDetails(bd);
          formik.setValues({
            bankName: bd.bankName ?? "",
            branchName: bd.branchName ?? "",
            accountNo: bd.accountNo ?? "",
            accountHolderName: bd.accountHolderName ?? "",
          });
          if (hasAnyBankDetails(bd)) toast.success("Bank details loaded.");
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load bank details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleDeleteConfirm = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteBankDetails(token);
      setBankDetails(emptyBankDetails);
      formik.setValues(emptyBankDetails);
      setShowDeleteModal(false);
      setIsEditing(false);
      toast.success("Bank details removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove bank details.");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    formik.setValues({
      bankName: bankDetails.bankName ?? "",
      branchName: bankDetails.branchName ?? "",
      accountNo: bankDetails.accountNo ?? "",
      accountHolderName: bankDetails.accountHolderName ?? "",
    });
    setIsEditing(true);
  };

  const hasDetails = hasAnyBankDetails(bankDetails);
  const inputClass = (name) => {
    const err = formik.touched[name] && formik.errors[name];
    const base = "w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary";
    return err ? `${base} border-red-500` : `${base} border-slate-300 dark:border-slate-600`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Bank Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Payout destination for your earnings</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isEditing ? (
          <form onSubmit={formik.handleSubmit}>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bank name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Landmark className="w-5 h-5" strokeWidth={1.5} />
                    </span>
                    <input
                      name="bankName"
                      placeholder="e.g. Commercial Bank"
                      value={formik.values.bankName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={inputClass("bankName")}
                      maxLength={100}
                    />
                  </div>
                  {formik.touched.bankName && formik.errors.bankName && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formik.errors.bankName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="w-5 h-5" strokeWidth={1.5} />
                    </span>
                    <input
                      name="branchName"
                      placeholder="e.g. Colombo Main"
                      value={formik.values.branchName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={inputClass("branchName")}
                      maxLength={100}
                    />
                  </div>
                  {formik.touched.branchName && formik.errors.branchName && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formik.errors.branchName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account number</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Hash className="w-5 h-5" strokeWidth={1.5} />
                    </span>
                    <input
                      name="accountNo"
                      placeholder="e.g. 1234567890"
                      value={formik.values.accountNo}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={`${inputClass("accountNo")} font-mono`}
                      maxLength={40}
                    />
                  </div>
                  {formik.touched.accountNo && formik.errors.accountNo && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formik.errors.accountNo}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account holder name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <User className="w-5 h-5" strokeWidth={1.5} />
                    </span>
                    <input
                      name="accountHolderName"
                      placeholder="Name as on bank account"
                      value={formik.values.accountHolderName}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      className={inputClass("accountHolderName")}
                      maxLength={100}
                    />
                  </div>
                  {formik.touched.accountHolderName && formik.errors.accountHolderName && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{formik.errors.accountHolderName}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? "Saving…" : "Save bank details"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="p-4 sm:p-6">
              {hasDetails ? (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Bank name</dt>
                    <dd className="text-slate-800 dark:text-slate-100 font-medium">{bankDetails.bankName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Branch name</dt>
                    <dd className="text-slate-800 dark:text-slate-100 font-medium">{bankDetails.branchName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Account number</dt>
                    <dd className="text-slate-800 dark:text-slate-100 font-mono font-medium">{bankDetails.accountNo || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Account holder name</dt>
                    <dd className="text-slate-800 dark:text-slate-100 font-medium">{bankDetails.accountHolderName || "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-sm">No bank details saved yet. Add your payout account below.</p>
              )}
            </div>
            <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { formik.setValues({ ...emptyBankDetails, ...bankDetails }); setIsEditing(true); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                {hasDetails ? (
                  <>
                    <Pencil className="w-5 h-5" />
                    Edit
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    Add bank details
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleting && setShowDeleteModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Remove bank details?</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This will clear your saved bank account. You can add new details anytime. Payout requests may require bank details to be set.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
