"use client";

import { useCallback, useSyncExternalStore } from "react";
// Relative imports: the unit tests load parseStoredConfig through Vitest,
// which does not resolve the "@/" path alias.
import { isCaseColorId, isKeycapColorId, isSwitchTypeId } from "../data/materials";
import { PRODUCT_CONFIG_STORAGE_KEY } from "../lib/constants";
import {
  DEFAULT_PRODUCT_CONFIG,
  type CaseColorId,
  type KeycapColorId,
  type ProductConfig,
  type SwitchTypeId,
} from "../types/product";

export type UseProductConfig = {
  readonly config: ProductConfig;
  readonly setCase: (id: CaseColorId) => void;
  readonly setKeycaps: (id: KeycapColorId) => void;
  readonly setSwitch: (id: SwitchTypeId) => void;
  readonly reset: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pure parser for a persisted configuration payload. Unknown keys, wrong types
 * and unrecognised ids are ignored, and every missing or invalid field falls
 * back to its default so a partially written payload still yields a usable
 * configuration. Unparseable input returns the default configuration.
 */
export function parseStoredConfig(raw: string | null): ProductConfig {
  if (typeof raw !== "string" || raw.length === 0) {
    return DEFAULT_PRODUCT_CONFIG;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PRODUCT_CONFIG;
  }

  if (!isRecord(parsed)) {
    return DEFAULT_PRODUCT_CONFIG;
  }

  return {
    case: isCaseColorId(parsed.case) ? parsed.case : DEFAULT_PRODUCT_CONFIG.case,
    keycaps: isKeycapColorId(parsed.keycaps)
      ? parsed.keycaps
      : DEFAULT_PRODUCT_CONFIG.keycaps,
    switchType: isSwitchTypeId(parsed.switchType)
      ? parsed.switchType
      : DEFAULT_PRODUCT_CONFIG.switchType,
  };
}

function readStoredConfig(): ProductConfig {
  if (typeof window === "undefined") {
    return DEFAULT_PRODUCT_CONFIG;
  }

  try {
    return parseStoredConfig(window.sessionStorage.getItem(PRODUCT_CONFIG_STORAGE_KEY));
  } catch {
    // Storage can be unavailable in hardened or privacy-constrained contexts.
    return DEFAULT_PRODUCT_CONFIG;
  }
}

function writeStoredConfig(config: ProductConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(PRODUCT_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // A failed write only costs persistence; the in-memory config still applies.
  }
}

// The canvas lives under a dynamically imported, client-only branch, so the
// configuration cannot be threaded down through React context from the layout.
// A module-scoped store keeps a single source of truth for every consumer
// without introducing a state manager dependency.
let currentConfig: ProductConfig = DEFAULT_PRODUCT_CONFIG;
let hasHydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hasHydrated) {
    return;
  }
  hasHydrated = true;
  currentConfig = readStoredConfig();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ProductConfig {
  hydrate();
  return currentConfig;
}

function getServerSnapshot(): ProductConfig {
  return DEFAULT_PRODUCT_CONFIG;
}

function commit(next: ProductConfig): void {
  hydrate();

  if (
    next.case === currentConfig.case &&
    next.keycaps === currentConfig.keycaps &&
    next.switchType === currentConfig.switchType
  ) {
    return;
  }

  currentConfig = next;
  writeStoredConfig(next);
  for (const listener of listeners) {
    listener();
  }
}

export function useProductConfig(): UseProductConfig {
  const config = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCase = useCallback((id: CaseColorId) => {
    commit({ ...currentConfig, case: id });
  }, []);

  const setKeycaps = useCallback((id: KeycapColorId) => {
    commit({ ...currentConfig, keycaps: id });
  }, []);

  const setSwitch = useCallback((id: SwitchTypeId) => {
    commit({ ...currentConfig, switchType: id });
  }, []);

  const reset = useCallback(() => {
    commit(DEFAULT_PRODUCT_CONFIG);
  }, []);

  return { config, setCase, setKeycaps, setSwitch, reset };
}