"use client";

import { useRouter } from "next/navigation";

/**
 * A "back" control that returns to the exact previous page — preserving its
 * scroll position and any tab state held in the URL (e.g. ?round=QF&view=completed).
 *
 * If there's no in-app history to return to (the page was opened directly via
 * a shared link or a fresh tab), it falls back to a sensible list page instead
 * of doing nothing.
 */
export default function BackButton({
  fallbackHref,
  className,
  children,
}: {
  fallbackHref: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
    >
      {children}
    </button>
  );
}
