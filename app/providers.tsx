"use client";

import * as React from "react";
import { initTelegram, MOCK_AGENT, type TelegramUser } from "@/lib/telegram";

interface TelegramContextValue {
  user: TelegramUser;
  inTelegram: boolean;
  /** False until the SDK has initialised on the client. */
  ready: boolean;
}

const TelegramContext = React.createContext<TelegramContextValue>({
  user: MOCK_AGENT,
  inTelegram: false,
  ready: false,
});

export function useTelegram() {
  return React.useContext(TelegramContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [value, setValue] = React.useState<TelegramContextValue>({
    user: MOCK_AGENT,
    inTelegram: false,
    ready: false,
  });

  React.useEffect(() => {
    let cancelled = false;
    initTelegram().then((result) => {
      if (!cancelled) setValue({ ...result, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
