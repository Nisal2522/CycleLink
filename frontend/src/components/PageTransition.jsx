/**
 * PageTransition.jsx
 * --------------------------------------------------
 * Framer Motion wrapper that provides smooth fade/slide
 * transitions when navigating between routes.
 *
 * Wrap any page component with <PageTransition> to get
 * consistent entrance and exit animations.
 *
 * Usage:
 *   <PageTransition>
 *     <CyclistDashboard />
 *   </PageTransition>
 * --------------------------------------------------
 */

import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full max-w-full min-h-screen min-h-[100dvh] overflow-x-hidden"
    >
      {children}
    </motion.div>
  );
}
