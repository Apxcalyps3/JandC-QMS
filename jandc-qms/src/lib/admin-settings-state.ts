/**
 * Admin Settings, UI Customization & System Operational State
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.5 & 8)
 * JANDC Internet Cafe and Services
 */

import { useState, useEffect } from "react";

export interface AdminSettings {
  systemState: "ONLINE" | "OFFLINE"; // SOP 8.2 Closing Routine toggle
  activeServers: 1 | 2; // SOP 6.1 c in {1, 2}
  theme: "light" | "dark" | "high-contrast";
  fontSize: "compact" | "default" | "large";
  fontColor: "default" | "zinc" | "slate";
  audioAlertsEnabled: boolean;
  adminName: string;
  adminRole: "Store Manager" | "Counter Staff" | "System Administrator";
  adminQrKey: string;
}

const DEFAULT_SETTINGS: AdminSettings = {
  systemState: "ONLINE",
  activeServers: 1,
  theme: "light",
  fontSize: "default",
  fontColor: "default",
  audioAlertsEnabled: true,
  adminName: "Nora Bobier",
  adminRole: "Store Manager",
  adminQrKey: "JANDC-ADMIN-KEY-2026-AUTH-X99",
};

const STORAGE_KEY = "jandc_admin_settings_v1";

function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.error("Failed to load admin settings:", e);
  }
  return DEFAULT_SETTINGS;
}

let globalSettings = loadSettings();
const listeners: Array<(s: AdminSettings) => void> = [];

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(globalSettings);

  useEffect(() => {
    const listener = (newSettings: AdminSettings) => setSettings({ ...newSettings });
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const updateSettings = (partial: Partial<AdminSettings>) => {
    globalSettings = { ...globalSettings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(globalSettings));
    } catch (e) {
      console.error("Failed to save admin settings:", e);
    }
    listeners.forEach((l) => l(globalSettings));

    // Apply high contrast / dark mode if selected
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (globalSettings.theme === "dark") {
        root.classList.add("dark");
        root.classList.remove("high-contrast");
      } else if (globalSettings.theme === "high-contrast") {
        root.classList.remove("dark");
        root.classList.add("high-contrast");
      } else {
        root.classList.remove("dark");
        root.classList.remove("high-contrast");
      }

      if (globalSettings.fontSize === "compact") {
        root.style.fontSize = "14px";
      } else if (globalSettings.fontSize === "large") {
        root.style.fontSize = "17px";
      } else {
        root.style.fontSize = "16px";
      }
    }
  };

  return {
    settings,
    updateSettings,
  };
}
