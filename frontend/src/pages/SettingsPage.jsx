/**
 * pages/SettingsPage.jsx
 * --------------------------------------------------
 * User settings: profile card, edit name, change password,
 * and danger zone (delete account).
 * --------------------------------------------------
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Trash2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import {
  getUserProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../services/authService";

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const ROLE_COLORS = {
  cyclist: "bg-emerald-100 text-emerald-700",
  partner: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
};

export default function SettingsPage() {
  const { user, token, logout, updateUser, uploadProfileImage } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Edit profile
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // Change password
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwError, setPwError] = useState("");

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getUserProfile(token)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setName(data.name || "");
        }
      })
      .catch(() => {
        if (!cancelled) setProfileError("Failed to load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleAvatarSelect = (e) => {
    const file = e.target?.files?.[0];
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file (e.g. JPG, PNG).");
      return;
    }
    setAvatarError("");
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      if (typeof base64 !== "string") {
        setUploadingAvatar(false);
        return;
      }
      try {
        const url = await uploadProfileImage(base64);
        if (url) {
          setProfile((p) => (p ? { ...p, profileImage: url } : null));
          showToast("Profile photo updated.");
        }
      } catch {
        setAvatarError("Upload failed. Please try again.");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!token || savingProfile) return;
    setProfileError("");
    setSavingProfile(true);
    try {
      const updated = await updateProfile(token, { name: name.trim() });
      setProfile((p) => (p ? { ...p, name: updated.name } : null));
      updateUser({ name: updated.name });
      showToast("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!token || savingPassword) return;
    setPwError("");
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(token, pwForm);
      setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      showToast("Password changed successfully.");
    } catch (err) {
      setPwError(err.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token || deleting) return;
    setDeleteError("");
    if (!deletePassword) {
      setDeleteError("Password is required.");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(token, deletePassword);
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] md:min-h-screen bg-slate-100/80 dark:bg-slate-900/50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-6 sm:pb-8">
          <div className="h-8 w-36 bg-slate-200/80 dark:bg-slate-700 rounded-lg mb-6 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-6">
              <div className="h-28 w-28 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse mb-4" />
              <div className="h-4 w-32 mx-auto bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 mx-auto bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-6 sm:p-8 space-y-4">
              <div className="h-5 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mb-5" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-11 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] md:min-h-screen bg-slate-100/80 dark:bg-slate-900/50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-6 sm:pb-8">
        {/* Toast */}
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

        {/* Header */}
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 mb-6 sm:mb-8"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your profile and account preferences.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Profile Card */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="relative rounded-2xl bg-gradient-to-b from-primary/90 via-primary to-slate-900 border border-primary/30 shadow-lg overflow-hidden px-6 py-6 sm:px-6 sm:py-7 flex flex-col min-h-0"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.15),transparent)]" />
            <div className="relative flex flex-col items-center text-center">
              <div className="relative mb-3">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/20 overflow-hidden flex items-center justify-center bg-slate-800/80">
                  {(profile?.profileImage || user?.profileImage) ? (
                    <img
                      src={profile?.profileImage || user?.profileImage}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white/50">
                      {(profile?.name || user?.name || "U").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white text-primary shadow-md cursor-pointer hover:bg-white/90 transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarSelect}
                  />
                </label>
              </div>
              {avatarError && (
                <p className="mb-1.5 text-[11px] text-red-200 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {avatarError}
                </p>
              )}
              <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-full px-2">
                {profile?.name || user?.name || "User"}
              </h2>
              <p className="text-xs text-white/60 truncate max-w-full px-2 mt-0.5">
                {profile?.email || user?.email}
              </p>
              <span
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full text-[11px] font-semibold px-2.5 py-1 capitalize ${
                  ROLE_COLORS[profile?.role || user?.role] || ROLE_COLORS.cyclist
                }`}
              >
                {profile?.role || user?.role || "cyclist"}
              </span>
              {profile?.createdAt && (
                <p className="mt-3 text-[11px] text-white/50">
                  Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </motion.div>

          {/* Right Column: Edit Profile + Change Password + Danger Zone */}
          <div className="lg:col-span-2 space-y-6">
            {/* Edit Profile */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
            >
              <div className="h-1 w-full bg-primary" />
              <div className="p-6 sm:p-8">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-5">
                  Edit Profile
                </h3>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile?.email || user?.email || ""}
                      disabled
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-600 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  {profileError && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {profileError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-semibold py-3 shadow-md hover:bg-primary/90 disabled:opacity-60 transition-all"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Change Password */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden"
            >
              <div className="h-1 w-full bg-amber-500" />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <KeyRound className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                    Change Password
                  </h3>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {[
                    { key: "currentPassword", label: "Current Password", toggle: "current" },
                    { key: "newPassword", label: "New Password", toggle: "new" },
                    { key: "confirmNewPassword", label: "Confirm New Password", toggle: "confirm" },
                  ].map(({ key, label, toggle }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords[toggle] ? "text" : "password"}
                          value={pwForm[key]}
                          onChange={(e) =>
                            setPwForm((f) => ({ ...f, [key]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(toggle)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPasswords[toggle] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {pwError && (
                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {pwError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white text-sm font-semibold py-3 shadow-md hover:bg-amber-600 disabled:opacity-60 transition-all"
                  >
                    {savingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    {savingPassword ? "Changing..." : "Change Password"}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="relative bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-lg overflow-hidden"
            >
              <div className="h-1 w-full bg-red-500" />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <h3 className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
                    Danger Zone
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
                </p>
                <button
                  onClick={() => { setShowDeleteModal(true); setDeletePassword(""); setDeleteError(""); }}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-red-500 text-red-600 dark:text-red-400 text-sm font-semibold px-5 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Delete Account</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                This will permanently delete your account and all associated data. Enter your password to confirm.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 mb-3"
              />
              {deleteError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {deleteError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-500 text-white text-sm font-semibold py-2.5 hover:bg-red-600 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
