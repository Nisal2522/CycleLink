/**
 * pages/partner/PartnerScanPage.jsx
 * --------------------------------------------------
 * QR Scanner for partners: camera + file upload, parse redemption JSON,
 * verification modal, confirm checkout via POST /api/redeem/confirm.
 * Full-width two-column layout: Scanner (left) + Recent Checkouts (right).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import {
  QrCode,
  Camera,
  Upload,
  User,
  Coins,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  History,
  ScanLine,
  Percent,
  Coffee,
  Gift,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { confirmRedeem, getPartnerCheckouts, getPartnerScanStats } from "../../services/partnerService";
import toast from "react-hot-toast";

const SCANNER_ELEMENT_ID = "partner-qr-reader";

/** Format date for activity feed: "Today, 10:36 AM" | "Yesterday, 2:30 PM" | short date */
function formatDateForActivity(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === d.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (today) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ", " + timeStr;
}

/** Icon for item name (e.g. coffee cup for coffee) */
function getItemIcon(itemName) {
  if (!itemName) return UtensilsCrossed;
  const lower = String(itemName).toLowerCase();
  if (lower.includes("coffee") || lower.includes("tea") || lower.includes("drink")) return Coffee;
  if (lower.includes("reward") || lower.includes("gift")) return Gift;
  return UtensilsCrossed;
}

/** Truncate transaction ID for display (e.g. txn_1771...) */
function truncateTxnId(id, maxLen = 12) {
  if (!id) return "—";
  const s = String(id);
  return s.length <= maxLen ? s : s.slice(0, maxLen) + "…";
}

const MAX_SCAN_DIMENSION = 1500;
const MAX_FULL_SIZE = 3000;
const FILE_SCAN_ELEMENT_ID = "partner-qr-file-scan";

function imageDataToGrayscale(imageData) {
  const { data, width, height } = imageData;
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = gray;
  }
}

function imageDataBinarize(imageData, threshold = 128) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const v = gray >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

/** Try jsQR on raw, grayscale, then binarized at several thresholds (for colored QRs e.g. purple/white). */
function tryJsQR(data, width, height) {
  const opts = { inversionAttempts: "attemptBoth" };
  let code = jsQR(data, width, height, opts);
  if (code) return code.data;
  const copy = new Uint8ClampedArray(data);
  const imageData = { data: copy, width, height };
  imageDataToGrayscale(imageData);
  code = jsQR(imageData.data, width, height, opts);
  if (code) return code.data;
  for (const threshold of [100, 128, 160, 200]) {
    const bin = new Uint8ClampedArray(copy);
    const id = { data: bin, width, height };
    imageDataBinarize(id, threshold);
    code = jsQR(id.data, width, height, opts);
    if (code) return code.data;
  }
  return null;
}

function drawRotated(ctx, img, w, h, rotationDeg) {
  ctx.save();
  if (rotationDeg === 0) {
    ctx.drawImage(img, 0, 0, w, h);
  } else if (rotationDeg === 90) {
    ctx.translate(h, 0);
    ctx.rotate(0.5 * Math.PI);
    ctx.drawImage(img, 0, 0, w, h);
  } else if (rotationDeg === 180) {
    ctx.translate(w, h);
    ctx.rotate(Math.PI);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.translate(0, w);
    ctx.rotate(-0.5 * Math.PI);
    ctx.drawImage(img, 0, 0, w, h);
  }
  ctx.restore();
}

function runCanvasScan(ctx, img, w, h, rotations) {
  const canvas = ctx.canvas;
  for (const rot of rotations) {
    const cw = rot === 90 || rot === 270 ? h : w;
    const ch = rot === 90 || rot === 270 ? w : h;
    canvas.width = cw;
    canvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    drawRotated(ctx, img, w, h, rot);
    const imageData = ctx.getImageData(0, 0, cw, ch);
    const result = tryJsQR(imageData.data, cw, ch);
    if (result) return result;
  }
  return null;
}

function scanFileWithCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.imageSmoothingEnabled = false;
        const rotations = [0, 90, 180, 270];

        // 1) Try at full size (capped) so QR isn't shrunk
        let w = naturalW;
        let h = naturalH;
        const fullMax = Math.max(w, h);
        if (fullMax > MAX_FULL_SIZE) {
          const s = MAX_FULL_SIZE / fullMax;
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        let result = runCanvasScan(ctx, img, w, h, rotations);
        if (result) {
          URL.revokeObjectURL(url);
          resolve(result);
          return;
        }

        // 2) Try scaled down (different pixel density can help)
        if (fullMax > MAX_SCAN_DIMENSION) {
          w = Math.round(naturalW * (MAX_SCAN_DIMENSION / fullMax));
          h = Math.round(naturalH * (MAX_SCAN_DIMENSION / fullMax));
          result = runCanvasScan(ctx, img, w, h, rotations);
          if (result) {
            URL.revokeObjectURL(url);
            resolve(result);
            return;
          }
        }

        URL.revokeObjectURL(url);
        resolve(null);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Premium stats card: deep ambient shadow, 4px gradient bar, glassmorphism border-t, muted labels, soft icon box. */
function StatsCard({ title, value, icon: Icon, gradientClass, iconBgClass, iconTextClass }) {
  return (
    <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.08),0_10px_25px_rgba(0,0,0,0.05)] border-t border-white/30 transition-all hover:shadow-[0_30px_70px_rgba(0,0,0,0.12),0_15px_35px_rgba(0,0,0,0.07)] min-w-0">
      <div
        className={`absolute top-0 left-0 w-full h-[4px] rounded-t-2xl bg-gradient-to-r ${gradientClass}`}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-slate-800 tabular-nums truncate">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl shrink-0 ${iconBgClass}`}>
          <Icon className={`w-6 h-6 ${iconTextClass}`} />
        </div>
      </div>
    </div>
  );
}

function parseQrPayload(decodedText) {
  try {
    const data = JSON.parse(decodedText);
    if (
      data &&
      typeof data.transactionId !== "undefined" &&
      typeof data.cyclistId !== "undefined" &&
      typeof data.tokenAmount !== "undefined"
    ) {
      return {
        transactionId: data.transactionId,
        mealName: data.mealName ?? data.rewardTitle ?? "",
        tokenAmount: Number(data.tokenAmount) || 0,
        cyclistName: data.cyclistName ?? "",
        cyclistId: data.cyclistId,
        expiryTime: data.expiryTime || null,
      };
    }
  } catch (_) {}
  return null;
}

function validatePayload(payload) {
  if (!payload || payload.tokenAmount <= 0) return { valid: false, error: "Invalid QR code data" };
  if (payload.expiryTime) {
    const expiry = new Date(payload.expiryTime);
    if (Number.isNaN(expiry.getTime()) || expiry < new Date()) {
      return { valid: false, error: "This QR code has expired" };
    }
  }
  return { valid: true };
}

function applyDecoded(decodedText, setScanned, setScanError, toast) {
  const payload = parseQrPayload(decodedText);
  if (payload) {
    const { valid, error } = validatePayload(payload);
    if (valid) {
      setScanned(payload);
      setScanError("");
    } else {
      setScanError(error);
      toast.error(error);
    }
  } else {
    setScanError("Invalid QR code format");
    toast.error("Invalid QR Code - Please upload the correct file");
  }
}

export default function PartnerScanPage() {
  const { token } = useAuth();
  const [mode, setMode] = useState("file");
  const [scanned, setScanned] = useState(null);
  const [scanError, setScanError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [checkoutsData, setCheckoutsData] = useState({ checkouts: [], total: 0 });
  const [loadingCheckouts, setLoadingCheckouts] = useState(false);
  const [scanningFile, setScanningFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [stats, setStats] = useState({ scansToday: 0, tokensRedeemedToday: 0, successRate: 100 });
  const [loadingStats, setLoadingStats] = useState(true);
  const html5QrRef = useRef(null);
  const scannerStarted = useRef(false);
  const fileInputRef = useRef(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const data = await getPartnerScanStats(token);
      setStats({
        scansToday: data.scansToday ?? 0,
        tokensRedeemedToday: data.tokensRedeemedToday ?? 0,
        successRate: data.successRate ?? 100,
      });
    } catch {
      setStats({ scansToday: 0, tokensRedeemedToday: 0, successRate: 100 });
    } finally {
      setLoadingStats(false);
    }
  }, [token]);

  const fetchCheckouts = useCallback(async () => {
    if (!token) return;
    setLoadingCheckouts(true);
    try {
      const data = await getPartnerCheckouts(token, { page: 1, limit: 5 });
      setCheckoutsData({
        checkouts: data.checkouts || [],
        total: data.total ?? 0,
      });
    } catch {
      setCheckoutsData({ checkouts: [], total: 0 });
    } finally {
      setLoadingCheckouts(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCheckouts();
  }, [fetchCheckouts]);

  useEffect(() => {
    if (!confirmSuccess || !token) return;
    fetchStats();
    fetchCheckouts();
    setConfirmSuccess(false);
  }, [confirmSuccess, token, fetchStats, fetchCheckouts]);

  const stopCamera = useCallback(async () => {
    if (!html5QrRef.current || !scannerStarted.current) return;
    try {
      await html5QrRef.current.stop();
      scannerStarted.current = false;
    } catch (_) {}
  }, []);

  const startCamera = useCallback(() => {
    if (!document.getElementById(SCANNER_ELEMENT_ID)) return;
    if (html5QrRef.current && scannerStarted.current) return;
    const html5Qr = new Html5Qrcode(SCANNER_ELEMENT_ID);
    html5QrRef.current = html5Qr;
    html5Qr
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const payload = parseQrPayload(decodedText);
          if (payload) {
            const { valid, error } = validatePayload(payload);
            if (valid) {
              setScanned(payload);
              setScanError("");
              stopCamera();
            } else {
              setScanError(error);
              toast.error(error);
            }
          } else {
            setScanError("Invalid QR code format");
            toast.error("Invalid QR Code - Please upload the correct file");
          }
        },
        () => {}
      )
      .then(() => { scannerStarted.current = true; })
      .catch((err) => {
        setScanError("Camera access failed. Try uploading an image.");
        toast.error("Camera access failed");
        console.warn(err);
      });
  }, [stopCamera]);

  useEffect(() => {
    if (mode === "camera") {
      setScanError("");
      const t = setTimeout(() => startCamera(), 100);
      return () => {
        clearTimeout(t);
        const qr = html5QrRef.current;
        const wasStarted = scannerStarted.current;
        scannerStarted.current = false;
        html5QrRef.current = null;
        if (qr) {
          const safeClear = () => {
            try {
              const c = qr.clear();
              if (c && typeof c.catch === "function") c.catch(() => {});
            } catch (_) {}
          };
          if (wasStarted) {
            const p = qr.stop();
            if (p && typeof p.then === "function") p.then(safeClear).catch(() => {});
            else safeClear();
          } else safeClear();
        }
      };
    } else {
      const qr = html5QrRef.current;
      const wasStarted = scannerStarted.current;
      scannerStarted.current = false;
      html5QrRef.current = null;
      if (qr) {
        const safeClear = () => {
          try {
            const c = qr.clear();
            if (c && typeof c.catch === "function") c.catch(() => {});
          } catch (_) {}
        };
        if (wasStarted) {
          const p = qr.stop();
          if (p && typeof p.then === "function") p.then(safeClear).catch(() => {});
          else safeClear();
        }
      }
    }
  }, [mode, startCamera, stopCamera]);

  const clearUpload = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedFile(null);
    setScanError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP).");
      return;
    }
    setScanError("");
    const url = URL.createObjectURL(file);
    setUploadedFile(file);
    setPreviewUrl(url);
    setScanningFile(true);
    scanFileWithCanvas(file)
      .then((decodedText) => {
        if (decodedText) {
          applyDecoded(decodedText, setScanned, setScanError, toast);
          return;
        }
        const el = document.getElementById(FILE_SCAN_ELEMENT_ID);
        if (!el) {
          setScanError("No clear QR code found in image");
          toast.error("Invalid QR Code - Please upload the correct file");
          return;
        }
        const html5Qr = new Html5Qrcode(FILE_SCAN_ELEMENT_ID);
        return html5Qr
          .scanFile(file, false)
          .then((decodedFromFallback) => {
            if (decodedFromFallback) {
              applyDecoded(decodedFromFallback, setScanned, setScanError, toast);
            } else {
              setScanError("No clear QR code found in image");
              toast.error("Invalid QR Code - Please upload the correct file");
            }
          })
          .catch(() => {
            setScanError("No clear QR code found in image");
            toast.error("Invalid QR Code - Please upload the correct file");
          })
          .finally(() => {
            html5Qr.clear().catch(() => {});
          });
      })
      .catch(() => {
        setScanError("No clear QR code found in image");
        toast.error("Invalid QR Code - Please upload the correct file");
      })
      .finally(() => {
        setScanningFile(false);
      });
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
    else toast.error("Upload not ready. Please try again.");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (mode === "camera") clearUpload();
  }, [mode, clearUpload]);

  const handleConfirmCheckout = async () => {
    if (!token || !scanned) return;
    setConfirming(true);
    try {
      await confirmRedeem(token, {
        transactionId: scanned.transactionId,
        mealName: scanned.mealName,
        tokenAmount: scanned.tokenAmount,
        cyclistName: scanned.cyclistName,
        cyclistId: scanned.cyclistId,
        expiryTime: scanned.expiryTime || undefined,
      });
      setConfirmSuccess(true);
      setScanned(null);
      toast.success("Checkout completed");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Checkout failed";
      setScanError(msg);
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  const clearScanned = () => {
    setScanned(null);
    setScanError("");
    setConfirmSuccess(false);
    if (mode === "file") clearUpload();
    if (mode === "camera") setTimeout(() => startCamera(), 150);
  };

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 mt-6">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Scan QR</h1>
            <p className="text-sm text-slate-500">Scan cyclist redemption QR or upload an image</p>
          </div>
        </div>

        {/* Stats row — premium style (Partner Dashboard match): deep shadow, gradient bar, glassmorphism, muted labels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <StatsCard
            title="Total Scans Today"
            value={loadingStats ? "—" : stats.scansToday}
            icon={ScanLine}
            gradientClass="from-orange-400 to-yellow-300"
            iconBgClass="bg-amber-500/10"
            iconTextClass="text-amber-600"
          />
          <StatsCard
            title="Tokens Redeemed"
            value={loadingStats ? "—" : stats.tokensRedeemedToday}
            icon={Coins}
            gradientClass="from-purple-500 to-pink-500"
            iconBgClass="bg-purple-500/10"
            iconTextClass="text-purple-600"
          />
          <StatsCard
            title="Success Rate"
            value={loadingStats ? "—" : `${stats.successRate}%`}
            icon={Percent}
            gradientClass="from-emerald-400 to-cyan-400"
            iconBgClass="bg-emerald-500/10"
            iconTextClass="text-emerald-600"
          />
        </div>

        {/* Two-column dashboard: Scanner (7) + Recent Checkouts (5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left: QR Scanner card — stronger 3D & shadow */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.12),0_15px_40px_rgba(0,0,0,0.08),0_5px_15px_rgba(0,0,0,0.04)] border-t border-white/40 overflow-hidden transition-shadow hover:shadow-[0_35px_90px_rgba(0,0,0,0.14),0_18px_45px_rgba(0,0,0,0.09)]">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">QR Scanner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Camera or upload an image with a QR code</p>
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex rounded-xl bg-slate-50 border border-slate-100 p-1 mb-4">
                  <button
                    type="button"
                    onClick={() => setMode("file")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      mode === "file" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("camera")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      mode === "camera" ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    Camera
                  </button>
                </div>

                {scanError && !scanned && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm mb-4"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{scanError}</span>
                  </motion.div>
                )}

                {confirmSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm mb-4"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Checkout completed successfully.</span>
                  </motion.div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  aria-hidden
                  tabIndex={-1}
                  onChange={handleFileSelect}
                />
                <div
                  id={FILE_SCAN_ELEMENT_ID}
                  className="absolute w-px h-px -left-[9999px] overflow-hidden opacity-0 pointer-events-none"
                  aria-hidden
                />
                {!scanned && (
                  <>
                    {/* Camera mode: live feed only */}
                    {mode === "camera" && (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 overflow-hidden relative w-full">
                        <div
                          id={SCANNER_ELEMENT_ID}
                          className="min-h-[320px] sm:min-h-[380px] w-full"
                        />
                      </div>
                    )}
                    {/* Upload Image mode: dropzone or preview */}
                    {mode === "file" && (
                      <div
                        className={`rounded-2xl border-2 border-dashed w-full min-h-[320px] sm:min-h-[380px] overflow-hidden relative flex flex-col items-center justify-center transition-colors ${
                          !previewUrl ? "cursor-pointer" : ""
                        } ${dragOver ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50/50"}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !previewUrl && triggerFileInput()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && !previewUrl) {
                            e.preventDefault();
                            triggerFileInput();
                          }
                        }}
                        aria-label="Drag and drop QR image here or click to browse"
                      >
                        {!previewUrl ? (
                          <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                            <Upload className="w-14 h-14 text-slate-400 mb-3" />
                            <p className="text-sm font-medium text-slate-600 mb-1">
                              Drag & drop QR image here or click to browse
                            </p>
                            <p className="text-xs text-slate-400">PNG, JPG or WebP</p>
                            {scanningFile && (
                              <div className="mt-4 flex items-center gap-2 text-primary">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm font-medium">Scanning…</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative w-full h-full min-h-[320px] sm:min-h-[380px] flex flex-col items-center justify-center p-4">
                            <img
                              src={previewUrl}
                              alt="Uploaded QR"
                              className="max-w-full max-h-[280px] sm:max-h-[340px] object-contain rounded-lg bg-white shadow-inner"
                            />
                            {scanningFile && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                  <span className="text-sm font-medium text-slate-700">Scanning QR code…</span>
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearUpload();
                              }}
                              disabled={scanningFile}
                              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Clear / Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <AnimatePresence mode="wait">
                  {!scanned && (
                    <motion.p
                      key="hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-slate-400 mt-3"
                    >
                      {mode === "camera" ? "Point the camera at the cyclist's QR code" : "Upload an image containing the redemption QR code"}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right: Recent Checkouts — modern activity feed, glassmorphism */}
          <div className="lg:col-span-5">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.12),0_15px_40px_rgba(0,0,0,0.08),0_5px_15px_rgba(0,0,0,0.04)] border border-white/20 border-t border-white/40 overflow-hidden flex flex-col h-full min-h-[360px] transition-shadow hover:shadow-[0_35px_90px_rgba(0,0,0,0.14),0_18px_45px_rgba(0,0,0,0.09)]">
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100/80 flex items-center gap-2 shrink-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                <History className="w-5 h-5 text-slate-600" />
                <h2 className="font-semibold text-slate-800">Recent Checkouts</h2>
              </div>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2.5 overscroll-contain min-h-0">
                  {loadingCheckouts ? (
                    <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Loading…
                    </div>
                  ) : checkoutsData.checkouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <History className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-500">No checkouts yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Complete a scan to see history here</p>
                    </div>
                  ) : (
                    checkoutsData.checkouts.map((row) => {
                      const ItemIcon = getItemIcon(row.itemName);
                      return (
                        <div
                          key={row.transactionId}
                          className="bg-white rounded-xl border border-slate-100/80 p-3.5 shadow-sm hover:scale-[1.01] hover:shadow-md hover:border-purple-200/60 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-sm font-bold text-purple-700 shrink-0 ring-2 ring-white shadow-sm">
                                {(row.cyclistName || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">{row.cyclistName || "—"}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 text-slate-600">
                                  <ItemIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                  <span className="text-xs truncate">{row.itemName || "—"}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 font-mono" title={row.transactionId}>{truncateTxnId(row.transactionId)}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{formatDateForActivity(row.dateTime)}</p>
                              </div>
                            </div>
                            <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                              −{row.tokens}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {checkoutsData.total > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100/80 bg-white/50 shrink-0">
                    <p className="text-xs text-slate-500">Latest 5 of {checkoutsData.total} checkouts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Modal */}
        <AnimatePresence>
          {scanned && (
            <motion.div
              key="verification-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={(e) => e.target === e.currentTarget && clearScanned()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="verification-modal-title"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl border border-primary/20 bg-white shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-primary/10 px-4 py-3 border-b border-primary/20 flex items-center justify-between">
                  <span id="verification-modal-title" className="font-bold text-primary">Verification</span>
                  <button type="button" onClick={clearScanned} className="p-1.5 rounded-lg hover:bg-primary/20 text-primary" aria-label="Close and scan again">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <ul className="divide-y divide-slate-100 p-0">
                  <li className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Meal / Reward</p>
                      <p className="text-slate-800 font-semibold">{scanned.mealName || "—"}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Cyclist</p>
                      <p className="text-slate-800 font-semibold">{scanned.cyclistName || "—"}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Tokens to deduct</p>
                      <p className="text-slate-800 font-bold text-primary">{scanned.tokenAmount} tokens</p>
                    </div>
                  </li>
                </ul>
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={handleConfirmCheckout}
                    disabled={confirming}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-70 transition-colors"
                  >
                    {confirming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Confirm Checkout
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
