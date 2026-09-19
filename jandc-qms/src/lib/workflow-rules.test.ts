import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_NAV_ITEMS,
  getNextOrderStatus,
  isCounterPaymentAvailable,
  MAX_COUNTER_PAYMENT_COPIES,
  normalizeEstimatedWaitMinutes,
  validateCheckoutContact,
  validatePaymentRequirements,
} from "./workflow-rules.ts";

test("counter checkout accepts a name without requiring an email", () => {
  assert.deepEqual(validateCheckoutContact("counter", ""), { valid: true });
  assert.deepEqual(
    validatePaymentRequirements({
      paymentMethod: "counter",
      paymentReference: "",
      hasReceipt: false,
    }),
    { valid: true }
  );
});

test("online checkout requires email, reference, and receipt", () => {
  assert.equal(validateCheckoutContact("online", "   ").valid, false);
  assert.equal(
    validatePaymentRequirements({
      paymentMethod: "online",
      paymentReference: "1234",
      hasReceipt: false,
    }).valid,
    false
  );
  assert.equal(
    validatePaymentRequirements({
      paymentMethod: "online",
      paymentReference: "1234",
      hasReceipt: true,
    }).valid,
    true
  );
});

test("online checkout keeps phone optional", () => {
  assert.deepEqual(validateCheckoutContact("online", "customer@example.com"), {
    valid: true,
  });
});

test("counter payment is available through 40 copies and unavailable above it", () => {
  assert.equal(isCounterPaymentAvailable(MAX_COUNTER_PAYMENT_COPIES), true);
  assert.equal(isCounterPaymentAvailable(MAX_COUNTER_PAYMENT_COPIES + 1), false);
  assert.equal(
    validatePaymentRequirements({
      paymentMethod: "counter",
      paymentReference: "",
      hasReceipt: false,
      copies: MAX_COUNTER_PAYMENT_COPIES + 1,
    }).valid,
    false
  );
  assert.equal(
    validatePaymentRequirements({
      paymentMethod: "counter",
      paymentReference: "",
      hasReceipt: false,
      copies: MAX_COUNTER_PAYMENT_COPIES,
    }).valid,
    true
  );
});

test("tracking never displays a zero-minute wait", () => {
  assert.equal(normalizeEstimatedWaitMinutes(0), 1);
  assert.equal(normalizeEstimatedWaitMinutes(null), 1);
  assert.equal(normalizeEstimatedWaitMinutes(12), 12);
});

test("staff queue advances only from pending to processing to completed", () => {
  assert.equal(getNextOrderStatus("pending"), "processing");
  assert.equal(getNextOrderStatus("processing"), "completed");
  assert.equal(getNextOrderStatus("completed"), null);
  assert.equal(getNextOrderStatus("cancelled"), null);
});

test("admin navigation contains only the simplified surfaces", () => {
  const hrefs = ADMIN_NAV_ITEMS.map((item) => item.href);
  assert.deepEqual(hrefs, [
    "/admin",
    "/admin/orders",
    "/admin/queue",
    "/admin/payments",
    "/admin/analytics",
  ]);
  assert.equal(hrefs.includes("/admin/services"), false);
  assert.equal(hrefs.includes("/admin/customers"), false);
});