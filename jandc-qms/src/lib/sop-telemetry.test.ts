import test from "node:test";
import assert from "node:assert/strict";
import { computeQueueTelemetry } from "./queue-telemetry-engine.ts";
import { 
  evaluateAndSortScheduledJobs, 
  SCHEDULING_HEURISTICS, 
} from "./scheduling-theory-engine.ts";
import type { ScheduledJob } from "./scheduling-theory-engine.ts";

test("G/G/c telemetry engine calculates all 21 variables for c=1 and c=2", () => {
  const telemetry1 = computeQueueTelemetry({
    activeServers: 1,
    activeOrderCount: 4,
    recentOrders: [
      { pageCount: 10, copies: 1, estimatedMinutes: 4 },
      { pageCount: 20, copies: 1, estimatedMinutes: 6 },
      { pageCount: 5, copies: 2, estimatedMinutes: 4 },
    ],
  });

  assert.equal(telemetry1.activeServers, 1);
  assert.equal(telemetry1.queueModel, "G/G/1");
  assert.ok(telemetry1.meanArrivalRate > 0, "λ must be positive");
  assert.ok(telemetry1.meanServiceRate > 0, "μ must be positive");
  assert.ok(telemetry1.meanSystemUtilization > 0, "ρ must be positive");
  assert.ok(telemetry1.meanQueueWaitingTime >= 0, "Wq must be non-negative");
  assert.ok(telemetry1.meanTotalTimeInSystem >= telemetry1.meanQueueWaitingTime, "W must be >= Wq");
  assert.equal(telemetry1.bufferMinutes, 2.0, "T_buffer must be 2.0 minutes per SOP 6.1.2");
  assert.ok(telemetry1.estimatedCompletionMinutes > telemetry1.meanTotalTimeInSystem);

  const telemetry2 = computeQueueTelemetry({
    activeServers: 2,
    activeOrderCount: 4,
    recentOrders: [
      { pageCount: 10, copies: 1, estimatedMinutes: 4 },
      { pageCount: 20, copies: 1, estimatedMinutes: 6 },
      { pageCount: 5, copies: 2, estimatedMinutes: 4 },
    ],
  });

  assert.equal(tele2ModelCheck(telemetry2.queueModel), "G/G/2");
  assert.equal(telemetry2.activeServers, 2);
  // Dual server should yield lower or equal wait time than single server
  assert.ok(
    telemetry2.meanQueueWaitingTime <= telemetry1.meanQueueWaitingTime,
    "Dual servers must reduce or match mean queue waiting time Wq"
  );
});

function tele2ModelCheck(model: string) {
  return model;
}

test("Scheduling theory engine supports all 7 heuristics and sorts properly", () => {
  assert.equal(SCHEDULING_HEURISTICS.length, 7);

  const sampleJobs: ScheduledJob[] = [
    {
      id: 1,
      orderNumber: "101",
      customerName: "Alice",
      paperSize: "Letter",
      printColor: "bw",
      pageCount: 10,
      copies: 1,
      totalAmount: 20,
      pickupTime: new Date(Date.now() + 10800000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: "pending",
      channel: "online",
    },
    {
      id: 2,
      orderNumber: "102",
      customerName: "Bob",
      paperSize: "Legal",
      printColor: "color",
      pageCount: 50,
      copies: 2,
      totalAmount: 250,
      pickupTime: new Date(Date.now() + 3600000).toISOString(), // Urgent
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      status: "pending",
      channel: "offline",
    },
  ];

  // ATC-P sort
  const atcSorted = evaluateAndSortScheduledJobs(sampleJobs, "ATC-P");
  assert.equal(atcSorted.length, 2);
  assert.ok(atcSorted[0].atcIndex !== undefined);

  // EDD sort (Earliest Due Date first: Bob's due date is closer)
  const eddSorted = evaluateAndSortScheduledJobs(sampleJobs, "EDD");
  assert.equal(eddSorted[0].orderNumber, "102", "Earliest due date must be prioritized first");

  // SPT sort (Shortest Processing Time first: Alice has fewer pages)
  const sptSorted = evaluateAndSortScheduledJobs(sampleJobs, "SPT");
  assert.equal(sptSorted[0].orderNumber, "101", "Shortest processing time must be prioritized first");

  // LPT sort (Longest Processing Time first: Bob has more pages)
  const lptSorted = evaluateAndSortScheduledJobs(sampleJobs, "LPT");
  assert.equal(lptSorted[0].orderNumber, "102", "Longest processing time must be prioritized first");
});
