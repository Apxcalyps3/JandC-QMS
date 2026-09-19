/**
 * Printer Hardware Telemetry & Audio Notification State
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.1 & Table 2)
 * JANDC Internet Cafe and Services
 */

import { useState, useEffect } from "react";

export type PrinterStatus = "idle" | "printing" | "in_error";
export type HardwareErrorType = "paper_jam" | "tray_empty" | "ink_fault" | null;

export interface PrinterHardware {
  id: string;
  name: string;
  model: string;
  trays: string[]; // e.g. ["Letter", "A4"] or ["Legal", "Folio"]
  ppm: number;
  colorSupported: boolean;
  status: PrinterStatus;
  currentOrderId?: string;
  errorReason?: HardwareErrorType;
  errorDescription?: string;
  printedPagesToday: number;
}

const INITIAL_PRINTERS: PrinterHardware[] = [
  {
    id: "p1",
    name: "Standard Station A",
    model: "HP LaserJet Pro M404dn",
    trays: ["Letter", "A4"],
    ppm: 38,
    colorSupported: false,
    status: "idle",
    printedPagesToday: 142,
  },
  {
    id: "p2",
    name: "Color & Long Station B",
    model: "Epson EcoTank L3210",
    trays: ["Legal", "Folio", "A4"],
    ppm: 20,
    colorSupported: true,
    status: "idle",
    printedPagesToday: 86,
  },
  {
    id: "p3",
    name: "High-Speed Station C",
    model: "Brother HL-L2370DW",
    trays: ["Letter", "A4"],
    ppm: 34,
    colorSupported: false,
    status: "idle",
    printedPagesToday: 210,
  },
];

let globalPrinters: PrinterHardware[] = [...INITIAL_PRINTERS];
const listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function usePrinterHardware() {
  const [printers, setPrinters] = useState<PrinterHardware[]>(globalPrinters);

  useEffect(() => {
    const listener = () => setPrinters([...globalPrinters]);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  const simulateError = (printerId: string, errorType: HardwareErrorType) => {
    globalPrinters = globalPrinters.map((p) => {
      if (p.id === printerId) {
        return {
          ...p,
          status: "in_error" as PrinterStatus,
          errorReason: errorType,
          errorDescription:
            errorType === "paper_jam"
              ? "Paper jam detected in standard duplex feed"
              : errorType === "tray_empty"
              ? "Standard paper tray empty. Refill required."
              : "Ink level threshold depleted",
        };
      }
      return p;
    });
    notify();
  };

  const resolveError = (printerId: string) => {
    globalPrinters = globalPrinters.map((p) => {
      if (p.id === printerId) {
        return {
          ...p,
          status: "idle" as PrinterStatus,
          errorReason: null,
          errorDescription: undefined,
        };
      }
      return p;
    });
    notify();
  };

  const reRouteJob = (fromPrinterId: string) => {
    const fromPrinter = globalPrinters.find((p) => p.id === fromPrinterId);
    if (!fromPrinter || !fromPrinter.currentOrderId) return null;

    const idleTarget = globalPrinters.find(
      (p) => p.id !== fromPrinterId && p.status === "idle"
    );

    if (idleTarget) {
      globalPrinters = globalPrinters.map((p) => {
        if (p.id === fromPrinterId) {
          return {
            ...p,
            status: "in_error" as PrinterStatus,
            currentOrderId: undefined,
          };
        }
        if (p.id === idleTarget.id) {
          return {
            ...p,
            status: "printing" as PrinterStatus,
            currentOrderId: fromPrinter.currentOrderId,
          };
        }
        return p;
      });
      notify();
      return idleTarget;
    }
    return null;
  };

  const assignJobToPrinter = (orderId: string) => {
    const target = globalPrinters.find((p) => p.status === "idle");
    if (target) {
      globalPrinters = globalPrinters.map((p) =>
        p.id === target.id
          ? { ...p, status: "printing" as PrinterStatus, currentOrderId: orderId }
          : p
      );
      notify();
      return target;
    }
    return null;
  };

  const releasePrinterJob = (orderId: string) => {
    globalPrinters = globalPrinters.map((p) =>
      p.currentOrderId === orderId
        ? {
            ...p,
            status: "idle" as PrinterStatus,
            currentOrderId: undefined,
            printedPagesToday: p.printedPagesToday + 5,
          }
        : p
    );
    notify();
  };

  return {
    printers,
    simulateError,
    resolveError,
    reRouteJob,
    assignJobToPrinter,
    releasePrinterJob,
  };
}

/**
 * Web Audio Chime synthesizer for Incoming Order Alert (SOP 5.1.1)
 */
export function playOrderAlertChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = "sine";
    osc2.type = "sine";

    // Pleasant two-tone chime (F5 -> C6)
    osc1.frequency.setValueAtTime(698.46, ctx.currentTime);
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.18);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (err) {
    // Gracefully handle browser autoplay policy restriction
    console.debug("Audio notification suppressed by browser policy:", err);
  }
}
