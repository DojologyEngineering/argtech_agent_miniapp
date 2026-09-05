"use client";

/**
 * Telegram Mini App integration.
 *
 * The SDK reads `window` at import time, so it is only ever loaded lazily on
 * the client. Outside Telegram (plain browser during development) every call
 * degrades to a no-op and a mock agent identity is used.
 */

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName: string;
  username?: string;
  photoUrl?: string;
}

type WebAppLike = {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: { impactOccurred: (style: string) => void };
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
  version?: string;
  platform?: string;
  // Bot API 8.0+: device safe area (notches, home indicator) and the area
  // additionally covered by Telegram's own chrome. Not present on old clients.
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
};

let webApp: WebAppLike | null = null;

export const MOCK_AGENT: TelegramUser = {
  id: 0,
  firstName: "Field",
  lastName: "Agent",
  username: "argtech_agent",
};

/** Header colour must match the app's green chrome so Telegram blends in. */
const HEADER_COLOR = "#06642b";
const BACKGROUND_COLOR = "#f4f6f8";

function applySafeArea(app: WebAppLike) {
  const top = (app.safeAreaInset?.top ?? 0) + (app.contentSafeAreaInset?.top ?? 0);
  const bottom = (app.safeAreaInset?.bottom ?? 0) + (app.contentSafeAreaInset?.bottom ?? 0);
  document.documentElement.style.setProperty("--safe-top", `${top}px`);
  document.documentElement.style.setProperty("--safe-bottom", `${bottom}px`);
}

export async function initTelegram(): Promise<{ user: TelegramUser; inTelegram: boolean }> {
  if (typeof window === "undefined") return { user: MOCK_AGENT, inTelegram: false };

  try {
    const mod = await import("@twa-dev/sdk");
    const app = (mod.default ?? mod) as unknown as WebAppLike;
    webApp = app;

    app.ready();
    app.expand();
    app.setHeaderColor?.(HEADER_COLOR);
    app.setBackgroundColor?.(BACKGROUND_COLOR);
    // Stops the swipe-to-close gesture from firing while scrolling long forms.
    app.disableVerticalSwipes?.();

    const tgUser = app.initDataUnsafe?.user;
    if (!tgUser) return { user: MOCK_AGENT, inTelegram: false };

    // The CSS env(safe-area-inset-*) fallback used by default is unreliable
    // inside Telegram's WebView (notably on Android), so once we know we are
    // really running inside Telegram, override it with the client's own
    // reported insets — device inset plus whatever Telegram's chrome covers.
    applySafeArea(app);
    app.onEvent?.("safeAreaChanged", () => applySafeArea(app));
    app.onEvent?.("contentSafeAreaChanged", () => applySafeArea(app));

    return {
      user: {
        id: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? "",
        username: tgUser.username,
        photoUrl: tgUser.photo_url,
      },
      inTelegram: true,
    };
  } catch {
    return { user: MOCK_AGENT, inTelegram: false };
  }
}

export function haptic(style: "light" | "medium" | "heavy" = "light") {
  try {
    webApp?.HapticFeedback?.impactOccurred(style);
  } catch {
    // Older Telegram clients do not expose haptics.
  }
}

/** Wires Telegram's native back button to a callback; returns a cleanup fn. */
export function bindBackButton(onBack: () => void): () => void {
  const button = webApp?.BackButton;
  if (!button) return () => {};
  button.onClick(onBack);
  button.show();
  return () => {
    button.offClick(onBack);
    button.hide();
  };
}

export function hideBackButton() {
  webApp?.BackButton?.hide();
}
