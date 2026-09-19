export type PaymentMethod = "counter" | "online";
export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
export const MAX_COUNTER_PAYMENT_COPIES = 40;

export function isCounterPaymentAvailable(copies?: number | null): boolean {
  return (copies ?? 1) <= MAX_COUNTER_PAYMENT_COPIES;
}

export type CheckoutValidation = {
  valid: boolean;
  message?: string;
};

export function validateCheckoutContact(
  paymentMethod: PaymentMethod,
  email: string,
  orderMode?: "walk-in" | "scheduled"
): CheckoutValidation {
  // For walk-in orders, order number is used for customer tracking instead of names/emails/phones
  if (orderMode === "walk-in") {
    return { valid: true };
  }

  if (paymentMethod === "online" && !email.trim()) {
    return {
      valid: false,
      message: "Online transactions need an email address for payment and order updates.",
    };
  }

  return { valid: true };
}

export const LARGE_ORDER_PAGE_THRESHOLD = 25;

export function isLargePrintOrder(pageCount: number, copies: number): boolean {
  return (pageCount * copies) >= LARGE_ORDER_PAGE_THRESHOLD || copies >= 15;
}

export function validatePaymentRequirements({
  paymentMethod,
  paymentReference,
  hasReceipt,
  copies,
  receiptAmount,
  totalCost,
}: {
  paymentMethod: PaymentMethod | null;
  paymentReference: string;
  hasReceipt: boolean;
  copies?: number | null;
  receiptAmount?: number | null;
  totalCost?: number | null;
}): CheckoutValidation {
  if (!paymentMethod) {
    return {
      valid: false,
      message: "Choose counter payment or online payment.",
    };
  }

  if (paymentMethod === "counter" && !isCounterPaymentAvailable(copies)) {
    return {
      valid: false,
      message: `Counter payment is available only for orders up to ${MAX_COUNTER_PAYMENT_COPIES} copies. Choose online transaction.`,
    };
  }

  if (paymentMethod === "online" && paymentReference.trim().length < 4) {
    return {
      valid: false,
      message: "Enter your GCash/Maya reference number.",
    };
  }

  if (paymentMethod === "online" && !hasReceipt) {
    return {
      valid: false,
      message: "Please upload your payment screenshot.",
    };
  }

  if (
    paymentMethod === "online" &&
    totalCost !== undefined &&
    totalCost !== null &&
    receiptAmount !== undefined &&
    receiptAmount !== null
  ) {
    if (Math.abs(receiptAmount - totalCost) > 0.01) {
      return {
        valid: false,
        message: `Submitted receipt amount (₱${receiptAmount.toFixed(2)}) must be equal to the calculated cost (₱${totalCost.toFixed(2)}) in order for the order to be placed.`,
      };
    }
  }

  return { valid: true };
}

export function normalizeEstimatedWaitMinutes(estimatedMinutes?: number | null): number {
  return Math.max(1, estimatedMinutes ?? 1);
}

export function getNextOrderStatus(status: string): OrderStatus | null {
  if (status === "pending") return "processing";
  if (status === "processing") return "completed";
  return null;
}

export function isValidOrderNumber(orderNumber: string): boolean {
  return /^\d{3}$/.test(orderNumber.trim());
}

export function formatOrderNumber(input: string | number): string {
  const digits = String(input).replace(/\D/g, "").slice(0, 3);
  return digits;
}

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Home (Control Center)", icon: "home" },
  { href: "/admin/live-queue", label: "Live Queue Telemetry", icon: "liveQueue" },
  { href: "/admin/scheduled", label: "Scheduled Telemetry", icon: "scheduled" },
  { href: "/admin/history", label: "History & Revenue", icon: "history" },
  { href: "/admin/settings", label: "Settings & Security", icon: "settings" },
] as const;