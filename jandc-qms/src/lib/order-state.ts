import { useState, useEffect } from "react";
import { UploadedFile } from "@workspace/api-client-react";

export type OrderState = {
  serviceType: "printing" | "id-picture" | null;
  orderMode?: "walk-in" | "scheduled";
  orderNumber?: string;
  customerName: string;
  email: string;
  phone?: string;
  paperSize?: string;
  printColor?: string;
  copies?: number;
  photoSize?: string;
  files: UploadedFile[];
  // File customizations in system
  fileEdits?: Record<string, { rotation?: number; filter?: string; pageRange?: string }>;
  // Scheduling
  pickupTime?: string;
  // Payment
  paymentMethod?: "counter" | "online";
  totalAmount?: number;
  receiptAmount?: number;
  paymentReference?: string;
  paymentReceiptFilename?: string;
  paymentReceiptUrl?: string;
};

const defaultState: OrderState = {
  serviceType: null,
  orderMode: "walk-in",
  orderNumber: "",
  customerName: "",
  email: "",
  phone: "",
  paperSize: "A4",
  printColor: "bw",
  copies: 1,
  photoSize: "1x1",
  files: [],
  fileEdits: {},
  pickupTime: undefined,
  paymentMethod: undefined,
  totalAmount: undefined,
  receiptAmount: undefined,
  paymentReference: "",
  paymentReceiptFilename: "",
  paymentReceiptUrl: "",
};

export function useOrderState() {
  const [state, setState] = useState<OrderState>(() => {
    const saved = localStorage.getItem("jandc_order_state");
    return saved ? JSON.parse(saved) : defaultState;
  });

  useEffect(() => {
    localStorage.setItem("jandc_order_state", JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<OrderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const clearState = () => {
    setState(defaultState);
  };

  return { state, updateState, clearState };
}
