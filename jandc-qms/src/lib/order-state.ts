import { useState, useEffect } from "react";
import { UploadedFile } from "@workspace/api-client-react";

export type OrderState = {
  serviceType: "printing" | "id-picture" | null;
  customerName: string;
  email: string;
  phone?: string;
  paperSize?: string;
  printColor?: string;
  copies?: number;
  photoSize?: string;
  files: UploadedFile[];
  // Scheduling
  pickupTime?: string;
  // Payment
  paymentMethod?: "counter" | "online";
  totalAmount?: number;
  paymentReference?: string;
  paymentReceiptFilename?: string;
  paymentReceiptUrl?: string;
};

const defaultState: OrderState = {
  serviceType: null,
  customerName: "",
  email: "",
  phone: "",
  paperSize: "A4",
  printColor: "bw",
  copies: 1,
  photoSize: "1x1",
  files: [],
  pickupTime: undefined,
  paymentMethod: undefined,
  totalAmount: undefined,
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
