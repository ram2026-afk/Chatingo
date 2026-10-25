"use client";

import { useSyncExternalStore } from "react";

export function useOrigin() {
  return useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
}
