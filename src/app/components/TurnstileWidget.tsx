// src/components/TurnstileWidget.tsx
// Cloudflare Turnstile React wrapper. Loads the script on demand, renders the
// widget into a ref'd div, calls onVerify(token) when the user passes the
// challenge. Imperatively reset()-able via ref for forms that resubmit.

"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
          action?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback";

let scriptLoading = false;
let scriptLoaded = false;
const onLoadCallbacks: Array<() => void> = [];

function loadScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    onLoadCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;

    window.onloadTurnstileCallback = () => {
      scriptLoaded = true;
      onLoadCallbacks.splice(0).forEach((cb) => cb());
    };

    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  });
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  action?: string;
  className?: string;
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(function TurnstileWidget(
  { onVerify, onExpire, onError, theme = "auto", action, className },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      setMissingKey(true);
      // In dev (no key configured), auto-pass so local development isn't blocked.
      // Production envs will have the key set; the server-side verify also has its
      // own guard for the production-without-secret case.
      if (process.env.NODE_ENV !== "production") {
        onVerify("dev-mode-no-turnstile-key");
      }
      return;
    }

    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onError?.(),
        theme,
        action,
      });
    });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget may already be gone */
        }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (missingKey && process.env.NODE_ENV === "production") {
    return (
      <div className={className} style={{ color: "#b00", fontSize: 12 }}>
        CAPTCHA not configured. Please contact support.
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
});

export default TurnstileWidget;
