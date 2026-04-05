/**
 * pages/RedeemRewardsPage.jsx
 * --------------------------------------------------
 * Browse partner shops & redeem Eco-Tokens.
 *
 * Layout:
 *   - Back button + Search bar (top)
 *   - Responsive shop card grid (1 col mobile, 2 md, 3 lg)
 *   - Shimmer skeleton while loading
 *   - Modal with full reward list + QR code generation
 *
 * Accessible at: /dashboard/redeem
 * --------------------------------------------------
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Store,
  MapPin,
  Tag,
  Gift,
  Coins,
  X,
  QrCode,
  ChevronRight,
  Sparkles,
  Clock,
  AlertCircle,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import { getPartnerShops, getShopRewards } from "../services/cyclistService";

/* ── Animations ── */
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 },
  },
};

/* ── Badge colour palette for reward previews ── */
const BADGE_COLORS = [
  "bg-pink-100 text-pink-700",
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
];

/* ── Placeholder shop image ── */
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='240' fill='%23f1f5f9'%3E%3Crect width='400' height='240'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='14' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

/* ── Shimmer / Skeleton Card ── */
function ShopCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 animate-pulse">
      <div className="h-44 bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
          <div className="h-6 w-20 bg-slate-100 rounded-full" />
        </div>
        <div className="h-9 bg-slate-100 rounded-xl mt-3" />
      </div>
    </div>
  );
}

/* ── Modal Skeleton ── */
function ModalSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
          <div className="h-6 w-16 bg-slate-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════ */
export default function RedeemRewardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── State ── */
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal
  const [selectedShop, setSelectedShop] = useState(null);
  const [modalRewards, setModalRewards] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPartner, setModalPartner] = useState(null);

  // QR: reward + generated transaction/expiry for payload
  const [qrReward, setQrReward] = useState(null);
  const [qrTransactionId, setQrTransactionId] = useState("");
  const [qrExpiryTime, setQrExpiryTime] = useState("");
  const qrCanvasRef = useRef(null);

  /* ── Fetch shops on mount ── */
  useEffect(() => {
    setLoading(true);
    getPartnerShops()
      .then((data) => setShops(data))
      .catch(() => toast.error("Failed to load partner shops"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Filter shops by search ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return shops;
    const q = search.toLowerCase();
    return shops.filter(
      (s) =>
        (s.shopName || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (s.location || "").toLowerCase().includes(q)
    );
  }, [shops, search]);

  /* ── Open shop modal ── */
  const openShopModal = async (shop) => {
    setSelectedShop(shop);
    setModalLoading(true);
    setModalRewards([]);
    setModalPartner(null);
    setQrReward(null);
    setQrTransactionId("");
    setQrExpiryTime("");
    try {
      const { partner, rewards } = await getShopRewards(shop._id);
      setModalPartner(partner);
      setModalRewards(rewards);
    } catch {
      toast.error("Failed to load rewards");
    } finally {
      setModalLoading(false);
    }
  };

  /* ── Close modal ── */
  const closeModal = () => {
    setSelectedShop(null);
    setQrReward(null);
    setQrTransactionId("");
    setQrExpiryTime("");
  };

  const closeQrView = () => {
    setQrReward(null);
    setQrTransactionId("");
    setQrExpiryTime("");
  };

  /* ── Generate unique transaction ID ── */
  const generateTransactionId = () =>
    `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  /* ── Generate QR for a reward (sets transactionId + expiryTime) ── */
  const handleRedeem = (reward) => {
    setQrReward(reward);
    setQrTransactionId(generateTransactionId());
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    setQrExpiryTime(expiry.toISOString());
  };

  /* ── QR payload: transactionId, mealName, tokenAmount, cyclistName, cyclistId, expiryTime ── */
  const buildQrPayload = () => {
    if (!qrReward) return "";
    return JSON.stringify({
      transactionId: qrTransactionId,
      mealName: qrReward.title,
      tokenAmount: qrReward.tokenCost,
      cyclistName: user?.name ?? "",
      cyclistId: user?._id ?? "",
      expiryTime: qrExpiryTime,
    });
  };

  /* ── Download QR as PNG ── */
  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) {
      toast.error("QR code not ready");
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (blob) saveAs(blob, `reward-qr-${qrTransactionId || "redeem"}.png`);
        else toast.error("Could not create image");
      },
      "image/png",
      1.0
    );
  };

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ── Header ── */}
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-7"
        >
          <button
            onClick={() => navigate("/dashboard/rewards")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rewards
          </button>

          <div className="flex-1" />

          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 order-first sm:order-none">
            <Store className="w-5 h-5 sm:w-6 sm:h-6 inline-block mr-2 text-primary -mt-0.5" />
            Redeem Rewards
          </h1>

          <div className="flex-1 hidden sm:block" />
        </motion.div>

        {/* ── Search Bar ── */}
        <motion.div
          custom={1}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mb-5 sm:mb-7"
        >
          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shops by name, category, or location..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 shadow-sm transition-all"
            />
          </div>
        </motion.div>

        {/* ── Shop Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShopCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            custom={2}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-600 font-semibold mb-1">No shops found</p>
            <p className="text-sm text-slate-400">
              {search ? "Try a different search term" : "Partner shops will appear here once registered"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((shop, i) => (
              <motion.div
                key={shop._id}
                custom={i + 2}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                onClick={() => openShopModal(shop)}
                className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.08)] border border-slate-100/80 hover:shadow-[0_14px_40px_rgba(135,16,83,0.12)] hover:border-primary/20 cursor-pointer transition-all duration-300 group"
              >
                {/* Shop Image */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={shop.shopImage || PLACEHOLDER_IMG}
                    alt={shop.shopName || "Partner Shop"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                  />
                  {/* Category badge */}
                  {shop.category && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-slate-700 px-2.5 py-1 rounded-full shadow-sm">
                      <Tag className="w-3 h-3 text-primary" />
                      {shop.category}
                    </span>
                  )}
                  {/* Total rewards count */}
                  {shop.totalRewards > 0 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-primary/90 backdrop-blur-sm text-[11px] font-bold text-white px-2.5 py-1 rounded-full shadow-sm">
                      <Gift className="w-3 h-3" />
                      {shop.totalRewards} reward{shop.totalRewards !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4">
                  <h3 className="text-base font-bold text-slate-800 mb-1 truncate group-hover:text-primary transition-colors">
                    {shop.shopName || "Unnamed Shop"}
                  </h3>

                  {/* Location */}
                  {(shop.location || shop.address) && (
                    <p className="flex items-center gap-1 text-xs text-slate-400 mb-3 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {shop.location || shop.address}
                    </p>
                  )}

                  {/* Reward preview badges */}
                  {shop.rewardPreview?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {shop.rewardPreview.map((r, idx) => (
                        <span
                          key={r._id}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${BADGE_COLORS[idx % BADGE_COLORS.length]}`}
                        >
                          <Coins className="w-3 h-3" />
                          {r.tokenCost} — {r.title.length > 20 ? r.title.slice(0, 20) + "…" : r.title}
                        </span>
                      ))}
                      {shop.totalRewards > 2 && (
                        <span className="text-[11px] font-medium text-slate-400 px-2 py-1">
                          +{shop.totalRewards - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 mb-3 italic">No rewards yet</p>
                  )}

                  {/* CTA */}
                  <button className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-xl bg-slate-50 text-sm font-semibold text-slate-600 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    View All Rewards
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          REWARD MODAL
          ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedShop && (
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeModal}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div
              key="modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="relative">
                <div className="h-36 sm:h-44 overflow-hidden bg-slate-100">
                  <img
                    src={selectedShop.shopImage || PLACEHOLDER_IMG}
                    alt={selectedShop.shopName}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.src = PLACEHOLDER_IMG)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-4 right-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                    {selectedShop.shopName || "Partner Shop"}
                  </h2>
                  {(selectedShop.location || selectedShop.address) && (
                    <p className="flex items-center gap-1 text-xs text-white/80 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {selectedShop.location || selectedShop.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Body — scrollable */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {/* QR Code View */}
                <AnimatePresence mode="wait">
                  {qrReward ? (
                    <motion.div
                      key="qr"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center py-4"
                    >
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                          <QrCode className="w-3.5 h-3.5" />
                          Scan to Redeem
                        </div>
                        <h3 className="text-base font-bold text-slate-800">
                          {qrReward.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Show this QR code to the shop partner
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border-2 border-primary/20 shadow-inner">
                        <QRCodeCanvas
                          ref={qrCanvasRef}
                          value={buildQrPayload()}
                          size={200}
                          level="H"
                          includeMargin
                          bgColor="#ffffff"
                          fgColor="#870f53"
                        />
                      </div>

                      <button
                        onClick={handleDownloadQr}
                        className="mt-4 flex items-center justify-center gap-2 w-full max-w-[200px] px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        <QrCode className="w-4 h-4" />
                        Download QR Code
                      </button>

                      {/* Meal / reward details — purple/white theme */}
                      <div className="mt-6 w-full rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
                        <div className="bg-primary/10 px-4 py-2.5 border-b border-primary/20">
                          <p className="text-xs font-bold text-primary uppercase tracking-wide">Redemption details</p>
                        </div>
                        <ul className="divide-y divide-primary/10 p-0">
                          <li className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-500 font-medium">Transaction ID</span>
                            <span className="text-slate-800 font-mono text-xs truncate max-w-[160px]" title={qrTransactionId}>{qrTransactionId}</span>
                          </li>
                          <li className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-500 font-medium">Reward / Meal</span>
                            <span className="text-slate-800 font-semibold truncate max-w-[160px]">{qrReward.title}</span>
                          </li>
                          <li className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-500 font-medium">Token amount</span>
                            <span className="text-slate-800 font-bold text-primary">{qrReward.tokenCost} tokens</span>
                          </li>
                          <li className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-500 font-medium">Cyclist name</span>
                            <span className="text-slate-800 font-medium truncate max-w-[160px]">{user?.name || "—"}</span>
                          </li>
                          <li className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-500 font-medium">Cyclist ID</span>
                            <span className="text-slate-800 font-mono text-xs truncate max-w-[160px]" title={user?._id}>{user?._id || "—"}</span>
                          </li>
                          <li className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-500 font-medium">Expires</span>
                            <span className="text-slate-800 text-xs">{qrExpiryTime ? new Date(qrExpiryTime).toLocaleString() : "—"}</span>
                          </li>
                        </ul>
                      </div>

                      <button
                        onClick={closeQrView}
                        className="mt-5 px-5 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Back to Rewards
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700">
                          Available Rewards
                        </h3>
                        {!modalLoading && (
                          <span className="text-xs text-slate-400">
                            {modalRewards.length} reward{modalRewards.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {modalLoading ? (
                        <ModalSkeleton />
                      ) : modalRewards.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                            <Gift className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">No rewards available</p>
                          <p className="text-xs text-slate-400 mt-0.5">Check back later!</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {modalRewards.map((reward, idx) => {
                            const isExpired =
                              reward.expiryDate && new Date(reward.expiryDate) < new Date();
                            return (
                              <div
                                key={reward._id}
                                className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-all ${
                                  isExpired
                                    ? "bg-slate-50/50 border-slate-100 opacity-60"
                                    : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-sm"
                                }`}
                              >
                                {/* Icon */}
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    BADGE_COLORS[idx % BADGE_COLORS.length].split(" ")[0]
                                  }`}
                                >
                                  <Gift className={`w-4.5 h-4.5 ${BADGE_COLORS[idx % BADGE_COLORS.length].split(" ")[1]}`} />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {reward.title}
                                  </p>
                                  {reward.description && (
                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                      {reward.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                      <Coins className="w-3 h-3" />
                                      {reward.tokenCost} tokens
                                    </span>
                                    {reward.expiryDate && (
                                      <span
                                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                          isExpired
                                            ? "bg-red-50 text-red-500"
                                            : "bg-slate-50 text-slate-400"
                                        }`}
                                      >
                                        <Clock className="w-3 h-3" />
                                        {isExpired ? "Expired" : `Until ${new Date(reward.expiryDate).toLocaleDateString()}`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Redeem button */}
                                {!isExpired && (
                                  <button
                                    onClick={() => handleRedeem(reward)}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Redeem
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
