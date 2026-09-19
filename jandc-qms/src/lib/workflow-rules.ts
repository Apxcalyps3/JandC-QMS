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
  email: string
): CheckoutValidation {
  if (paymentMethod === "online" && !email.trim()) {
    return {
      valid: false,
      message: "Online transactions need an email address for payment and order updates.",
    };
  }

  return { valid: true };
}

export function validatePaymentRequirements({
  paymentMethod,
  paymentReference,
  hasReceipt,
  copies,
}: {
  paymentMethod: PaymentMethod | null;
  paymentReference: string;
  hasReceipt: boolean;
  copies?: number | null;
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

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/queue", label: "Queue", icon: "queue" },
  { href: "/admin/payments", label: "Payments", icon: "payments" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
] as const;