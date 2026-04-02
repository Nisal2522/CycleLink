/**
 * FadeIn.jsx
 * --------------------------------------------------
 * Reusable scroll-triggered animation wrapper.
 * Uses Framer Motion's `useInView` to animate children
 * when they enter the viewport.
 *
 * Props:
 *   - delay     : seconds to wait before animating (default 0)
 *   - direction : "up" | "down" | "left" | "right" (default "up")
 *   - className : additional Tailwind classes
 * --------------------------------------------------
 */

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function FadeIn({
  children,
  delay = 0,
  direction = "up",
  className = "",
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 40 : direction === "down" ? -40 : 0,
      x: direction === "left" ? 40 : direction === "right" ? -40 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
