import { useEffect, useState } from "react";

export type Currency = "USD" | "EUR" | "GBP" | "INR";

export const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "INR"];

// Static FX rates relative to USD. Edit here when needed.
export const FX: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
};

export function formatPrice(priceUsd: number, currency: Currency): string {
  const value = priceUsd * FX[currency];
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 0,
  });
  return formatter.format(value);
}

const STORAGE_KEY = "jelfie:currency";

// Cross-tab pub/sub for currency
type Listener = (c: Currency) => void;
const listeners = new Set<Listener>();

function readStored(): Currency {
  if (typeof window === "undefined") return "USD";
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v && (CURRENCIES as string[]).includes(v)) return v as Currency;
  return "USD";
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>("USD");

  useEffect(() => {
    setCurrencyState(readStored());
    const listener: Listener = (c) => setCurrencyState(c);
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setCurrencyState(e.newValue as Currency);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setCurrency = (c: Currency) => {
    window.localStorage.setItem(STORAGE_KEY, c);
    listeners.forEach((l) => l(c));
  };

  return { currency, setCurrency, format: (usd: number) => formatPrice(usd, currency) };
}
