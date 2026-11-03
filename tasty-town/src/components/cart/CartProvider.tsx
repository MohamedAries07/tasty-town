"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CartLine = { id: string; productId: string; slug: string; name: string; variantId: string | null; addonIds: string[]; quantity: number; notes: string; seenUnitPaise: number };
export type OrderType = "delivery" | "takeaway";
type State = { lines: CartLine[]; orderType: OrderType; coupon: string };
const KEY = "tt_cart_v1";
const MAX_QTY = 20;

type Ctx = State & {
  ready: boolean; count: number;
  add: (l: Omit<CartLine, "id">) => void;
  setQuantity: (id: string, q: number) => void;
  remove: (id: string) => void;
  acceptPrices: (prices: Record<string, number>) => void;
  setOrderType: (t: OrderType) => void;
  setCoupon: (c: string) => void;
  clear: () => void;
};
const CartContext = createContext<Ctx | null>(null);
const EMPTY: State = { lines: [], orderType: "delivery", coupon: "" };

function load(): State {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && Array.isArray(raw.lines)) return { lines: raw.lines, orderType: raw.orderType === "takeaway" ? "takeaway" : "delivery", coupon: String(raw.coupon ?? "") };
  } catch { /* corrupt storage: start fresh */ }
  return EMPTY;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    setState(load()); loaded.current = true; setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setState(load()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  }, [state]);

  const add = useCallback((l: Omit<CartLine, "id">) => setState((s) => {
    const sig = (x: Omit<CartLine, "id">) => [x.productId, x.variantId, [...x.addonIds].sort().join(","), x.notes].join("|");
    const hit = s.lines.find((x) => sig(x) === sig(l));
    if (hit) return { ...s, lines: s.lines.map((x) => (x === hit ? { ...x, quantity: Math.min(MAX_QTY, x.quantity + l.quantity), seenUnitPaise: l.seenUnitPaise } : x)) };
    return { ...s, lines: [...s.lines, { ...l, id: crypto.randomUUID() }] };
  }), []);
  const setQuantity = useCallback((id: string, q: number) => setState((s) => ({
    ...s, lines: q < 1 ? s.lines.filter((x) => x.id !== id) : s.lines.map((x) => (x.id === id ? { ...x, quantity: Math.min(MAX_QTY, q) } : x)) })), []);
  const remove = useCallback((id: string) => setState((s) => ({ ...s, lines: s.lines.filter((x) => x.id !== id) })), []);
  const acceptPrices = useCallback((p: Record<string, number>) => setState((s) => ({ ...s, lines: s.lines.map((x) => (p[x.id] !== undefined ? { ...x, seenUnitPaise: p[x.id] } : x)) })), []);
  const setOrderType = useCallback((orderType: OrderType) => setState((s) => ({ ...s, orderType })), []);
  const setCoupon = useCallback((coupon: string) => setState((s) => ({ ...s, coupon })), []);
  const clear = useCallback(() => setState((s) => ({ ...s, lines: [], coupon: "" })), []);

  const value = useMemo<Ctx>(() => ({ ...state, ready, count: state.lines.reduce((a, l) => a + l.quantity, 0),
    add, setQuantity, remove, acceptPrices, setOrderType, setCoupon, clear }), [state, ready, add, setQuantity, remove, acceptPrices, setOrderType, setCoupon, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
