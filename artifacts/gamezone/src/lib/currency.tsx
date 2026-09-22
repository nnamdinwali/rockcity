import { createContext, useContext, useMemo } from "react";

/**
 * Rockcity uses Coins only.
 * No real-money currency, no FX conversion, no cash display.
 * Balance is always shown as whole coins.
 */

type CurrencyContextValue = {
  /** Always "COINS" for display consistency. */
  currency: string;
  /** Always 1 — no conversion. */
  rate: number;
  ready: boolean;
  /** Format a balance amount as coins, e.g. "1,250 coins". */
  format: (amount: number) => string;
  /** No-op kept for compatibility with existing callers. */
  setCurrency: (code: string | null) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function formatCoins(amount: number): string {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  return `${n.toLocaleString("en-US")} coins`;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency: "COINS",
      rate: 1,
      ready: true,
      format: formatCoins,
      setCurrency: () => {
        // Currency selection removed — platform is coins-only.
      },
    }),
    []
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}

/** Convenience hook: format an amount as coins. */
export function useMoney() {
  return useCurrency().format;
}

/** Kept for any remaining imports that referenced the old base currency. */
export const BASE_CURRENCY = "COINS";
