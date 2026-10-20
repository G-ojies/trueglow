"use client";
import { useEffect, useState } from "react";
import { load, type StoreState } from "./store";

/** Current local store, refreshed whenever it is saved (null until mounted). */
export function useStore(): StoreState | null {
  const [state, setState] = useState<StoreState | null>(null);
  useEffect(() => {
    const refresh = () => setState(load());
    refresh();
    window.addEventListener("trueglow:store", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("trueglow:store", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return state;
}
