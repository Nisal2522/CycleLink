/**
 * pages/partner/ShopProfile.jsx
 * --------------------------------------------------
 * Partner Shop Profile: two-column layout.
 * Left: Profile card (Cloudinary image, shop name, Status: Active).
 * Right: Edit form (Name, Description, Category, Phone).
 * Uses GET/PATCH /api/partner/profile and Cloudinary upload.
 * --------------------------------------------------
 */

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Store,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import {
  getPartnerProfile,
  updatePartnerProfile,
  uploadShopImage,
} from "../../services/partnerService";

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const CATEGORIES = [
  "Cafe & Food",
  "Bike Shop",
  "Retail",
  "Services",
  "Other",
];

export default function ShopProfile() {
  const { user, token, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [toast, setToast] = useState(null);
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const [form, setForm] = useState({
    shopName: "",
    location: "",
    category: "",
    phoneNumber: "",
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getPartnerProfile(token)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setForm({
            shopName: data.shopName || "",
            location: data.location || "",
            category: data.category || "",
            phoneNumber: data.phoneNumber || "",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setFormError("Failed to load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token || saving) return;
    setFormError("");
    setSaving(true);
    try {
      const updated = await updatePartnerProfile(token, {
        shopName: form.shopName.trim() || undefined,
        location: form.location.trim() || undefined,
        category: form.category.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        shopImageUrl: profile?.shopImageUrl,
      });
      setProfile((p) => (p ? { ...p, ...updated } : null));
      updateUser({
        shopName: updated.shopName,
        shopImage: updated.shopImageUrl,
      });
      showToast("Profile updated successfully.");
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target?.files?.[0];
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file (e.g. JPG, PNG).");
      return;
    }
    setUploadError("");
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      if (typeof base64 !== "string") {
        setUploadingImage(false);
        return;
      }
      try {
        const { url } = await uploadShopImage(token, base64);
        await updatePartnerProfile(token, {
          shopName: form.shopName.trim() || profile?.shopName,
          location: form.location.trim() || profile?.location,
          category: form.category.trim() || profile?.category,
          phoneNumber: form.phoneNumber.trim() || profile?.phoneNumber,
          shopImageUrl: url,
        });
        setProfile((p) => (p ? { ...p, shopImageUrl: url } : null));
        updateUser({ shopImage: url });
        showToast("Shop photo updated.");
      } catch (err) {
        setUploadError(
          err.response?.data?.message ||
            "Cloudinary upload failed. Please try again or use a different image."
        );
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const content = (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-6 sm:pb-8">
      {/* Success / error toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-primary text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast.message}
        </motion.div>
      )}

      {/* Header — aligned with grid start */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-3 mb-6 sm:mb-8"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <Store className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">
            Shop Profile
          </h1>
          <p className="text-sm text-slate-500">
            Keep your details up to date and delight cyclists.
          </p>
        </div>
      </motion.div>

      {/* Two-column grid: 1 col Profile, 2 cols Form — full height on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {/* Left column (span 1): Profile card — full height to match form */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="relative rounded-2xl bg-gradient-to-b from-primary/90 via-primary to-slate-900 border border-primary/30 shadow-lg overflow-hidden px-6 py-6 sm:px-6 sm:py-7 flex flex-col min-h-0 h-full"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/20 overflow-hidden flex items-center justify-center bg-slate-800/80">
                {profile?.shopImageUrl ? (
                  <img
                    src={profile.shopImageUrl}
                    alt="Shop"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-10 h-10 text-white/50" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white text-primary shadow-md cursor-pointer hover:bg-white/90 transition-colors">
                {uploadingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={handleImageSelect}
                />
              </label>
            </div>
            {uploadError && (
              <p className="mb-1.5 text-[11px] text-red-200 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {uploadError}
              </p>
            )}
            <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-full px-2">
              {profile?.shopName || "Your Shop"}
            </h2>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Active
            </span>
          </div>
          <p className="relative mt-4 text-xs text-white/70 leading-snug text-center max-w-xs mx-auto">
            Redeem tokens and limited‑edition rewards for bike‑friendly visits.
          </p>
        </motion.div>

        {/* Right column (span 2): Shop Details form — inputs fill container */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 relative bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-0"
        >
          <div className="h-1 w-full bg-primary" />
          <div className="p-6 sm:p-8 flex-1 flex flex-col">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-5">
              Shop Details
            </h3>
            <form onSubmit={handleSave} className="space-y-4 w-full max-w-full">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Shop Name</label>
                <input
                  type="text"
                  value={form.shopName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shopName: e.target.value }))
                  }
                  placeholder="e.g. Urban Kitchen"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Location / City</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="e.g. Negombo, Colombo"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                  }
                  placeholder="071 983 9270"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              {formError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold py-3 shadow-md hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[100dvh] md:min-h-screen bg-slate-100/80 dark:bg-slate-900/50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-6 sm:pb-8">
          <div className="h-8 w-36 bg-slate-200/80 rounded-lg mb-6 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6">
              <div className="h-28 w-28 mx-auto rounded-full bg-slate-100 animate-pulse mb-4" />
              <div className="h-4 w-32 mx-auto bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 mx-auto bg-slate-100 rounded animate-pulse" />
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-lg p-6 sm:p-8 space-y-4">
              <div className="h-5 w-28 bg-slate-100 rounded animate-pulse mb-5" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-11 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="min-h-[100dvh] md:min-h-screen bg-slate-100/80 dark:bg-slate-900/50">{content}</div>;
}
