/**
 * G/G/c Multi-Server Queuing Theory Telemetry Engine
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 6.1)
 * JANDC Internet Cafe and Services
 */

export interface QueueTelemetryVariables {
  // (1) Queue Model
  queueModel: "G/G/1" | "G/G/2";
  // (2) Number of Active Servers (c in {1, 2})
  activeServers: number;
  // (3) Expected Inter-Arrival Time (E[A]) in minutes/order
  expectedInterArrivalTime: number;
  // (4) Expected Service Time (E[S]) in minutes/order
  expectedServiceTime: number;
  // (5) Variance of Arrival Times (sigma_a^2)
  varianceArrivalTimes: number;
  // (6) Variance of Service Times (sigma_s^2)
  varianceServiceTimes: number;
  // (7) Standard Deviation of Arrival Times (sigma_a)
  stdDevArrivalTimes: number;
  // (8) Standard Deviation of Service Times (sigma_s)
  stdDevServiceTimes: number;
  // (9) Arrival Coefficient of Variation (Ca and Ca^2)
  arrivalCoefVariation: number;
  arrivalCoefVariationSq: number;
  // (10) Service Coefficient of Variation (Cs and Cs^2)
  serviceCoefVariation: number;
  serviceCoefVariationSq: number;
  // (11) Mean Arrival Rate (lambda) orders/min
  meanArrivalRate: number;
  // (12) Mean Service Rate (mu) orders/min
  meanServiceRate: number;
  // (13) Offered Load (u = lambda / mu in Erlangs)
  offeredLoad: number;
  // (14) Mean System Utilization (rho_c = lambda / (c * mu))
  meanSystemUtilization: number;
  // (15) Empty System Probability (P0)
  emptySystemProbability: number;
  // (16) Mean Queue Length (Lq = lambda * Wq)
  meanQueueLength: number;
  // (17) Mean Orders in System (L = Lq + u)
  meanOrdersInSystem: number;
  // (18) Base Waiting Time under Markovian assumptions Wq(M/M/c) in minutes
  baseWaitingTime: number;
  // (19) Mean Queue Waiting Time Wq(G/G/c) via Kingman heavy-traffic approximation in minutes
  meanQueueWaitingTime: number;
  // (20) Mean Total Time in System (W = Wq + E[S]) in minutes
  meanTotalTimeInSystem: number;
  // (21) Waiting Burden Ratio (WBR = Wq / W)
  waitingBurdenRatio: number;

  // Dynamic Expected Completion Timestamp (Section 6.1.2)
  bufferMinutes: number;
  estimatedCompletionMinutes: number;
}

export function computeQueueTelemetry(params: {
  activeServers?: number;
  activeOrderCount?: number;
  recentOrders?: Array<{
    createdAt: string;
    processingStartedAt?: string | null;
    completedAt?: string | null;
    pageCount?: number;
    copies?: number;
    estimatedMinutes?: number;
  }>;
}): QueueTelemetryVariables {
  const c = params.activeServers === 2 ? 2 : 1;
  const queueModel: "G/G/1" | "G/G/2" = c === 1 ? "G/G/1" : "G/G/2";
  const orders = params.recentOrders || [];

  // Inter-arrival calculation from timestamps
  let interArrivals: number[] = [];
  if (orders.length >= 2) {
    const sorted = [...orders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const diffMin =
        (new Date(sorted[i].createdAt).getTime() - new Date(sorted[i - 1].createdAt).getTime()) /
        60000;
      if (diffMin > 0.1 && diffMin < 120) {
        interArrivals.push(diffMin);
      }
    }
  }

  // Baseline calibration defaults for JANDC print shop operations if sample is small
  const defaultEA = 4.2; // Mean 4.2 minutes between walk-ins
  const defaultES = 3.5; // Mean 3.5 minutes per print job

  const ea =
    interArrivals.length >= 2
      ? interArrivals.reduce((a, b) => a + b, 0) / interArrivals.length
      : defaultEA;

  // Variance of arrivals
  const varA =
    interArrivals.length >= 2
      ? interArrivals.reduce((sum, val) => sum + Math.pow(val - ea, 2), 0) /
        interArrivals.length
      : 2.1;

  // Service times calculation
  let serviceTimes: number[] = [];
  for (const o of orders) {
    if (o.processingStartedAt && o.completedAt) {
      const dur =
        (new Date(o.completedAt).getTime() - new Date(o.processingStartedAt).getTime()) / 60000;
      if (dur > 0.2 && dur < 60) serviceTimes.push(dur);
    } else if (o.estimatedMinutes) {
      serviceTimes.push(o.estimatedMinutes);
    }
  }

  const es =
    serviceTimes.length >= 1
      ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
      : defaultES;

  const varS =
    serviceTimes.length >= 2
      ? serviceTimes.reduce((sum, val) => sum + Math.pow(val - es, 2), 0) /
        serviceTimes.length
      : 1.8;

  const sigmaA = Math.sqrt(Math.max(0.01, varA));
  const sigmaS = Math.sqrt(Math.max(0.01, varS));

  const ca = sigmaA / ea;
  const caSq = Math.pow(ca, 2);

  const cs = sigmaS / es;
  const csSq = Math.pow(cs, 2);

  // Mean arrival rate lambda (orders/min) & mean service rate mu (orders/min)
  const lambda = 1 / ea;
  const mu = 1 / es;

  // Offered traffic load u in Erlangs
  const u = lambda / mu;

  // Mean system utilization rho_c = lambda / (c * mu)
  // Bound rho strictly < 0.96 for numerical stability
  const rawRho = lambda / (c * mu);
  const rho = Math.min(0.95, Math.max(0.05, rawRho));

  // Empty system probability P0
  let p0 = 0;
  if (c === 1) {
    p0 = 1 - rho;
  } else {
    // For c = 2: [ (2*rho)^0 / 0! + (2*rho)^1 / 1! + (2*rho)^2 / (2! * (1 - rho)) ]^-1
    const term0 = 1;
    const term1 = 2 * rho;
    const term2 = Math.pow(2 * rho, 2) / (2 * (1 - rho));
    p0 = 1 / (term0 + term1 + term2);
  }

  // Base waiting time Wq(M/M/c)
  let baseWq = 0;
  if (c === 1) {
    baseWq = rho / (mu * (1 - rho));
  } else {
    const cErlang = p0 * (Math.pow(2 * rho, 2) / (2 * (1 - rho)));
    baseWq = cErlang / (2 * mu - lambda);
  }

  // Mean Queue Waiting Time Wq via Kingman heavy-traffic approximation
  // Wq(G/G/c) approx ((Ca^2 + Cs^2)/2) * (rho^(sqrt(2(c+1)) - 1) / (c * mu * (1 - rho)))
  const variabilityFactor = (caSq + csSq) / 2;
  let kingmanWq = 0;
  if (c === 1) {
    kingmanWq = variabilityFactor * (rho / (mu * (1 - rho)));
  } else {
    const exponent = Math.sqrt(6) - 1; // approx 1.449
    kingmanWq = variabilityFactor * (Math.pow(rho, exponent) / (2 * mu * (1 - rho)));
  }

  // Mean Queue Length Lq = lambda * Wq
  const lq = lambda * kingmanWq;

  // Total orders in system L = Lq + u
  const l = lq + u;

  // Mean Total Time in System W = Wq + E[S]
  const w = kingmanWq + es;

  // Waiting Burden Ratio WBR = Wq / W
  const wbr = w > 0 ? kingmanWq / w : 0;

  // Dynamic Expected Completion Timestamp calculation (Section 6.1.2)
  const bufferMinutes = 2.0; // Fixed paper handling & collation allowance
  const activeQueued = Math.max(0, (params.activeOrderCount || 1) - 1);
  const estimatedCompletionMinutes =
    Math.max(1, Math.round(kingmanWq * (1 + activeQueued * 0.3) + es + bufferMinutes));

  return {
    queueModel,
    activeServers: c,
    expectedInterArrivalTime: Number(ea.toFixed(2)),
    expectedServiceTime: Number(es.toFixed(2)),
    varianceArrivalTimes: Number(varA.toFixed(3)),
    varianceServiceTimes: Number(varS.toFixed(3)),
    stdDevArrivalTimes: Number(sigmaA.toFixed(2)),
    stdDevServiceTimes: Number(sigmaS.toFixed(2)),
    arrivalCoefVariation: Number(ca.toFixed(3)),
    arrivalCoefVariationSq: Number(caSq.toFixed(3)),
    serviceCoefVariation: Number(cs.toFixed(3)),
    serviceCoefVariationSq: Number(csSq.toFixed(3)),
    meanArrivalRate: Number(lambda.toFixed(3)),
    meanServiceRate: Number(mu.toFixed(3)),
    offeredLoad: Number(u.toFixed(3)),
    meanSystemUtilization: Number(rho.toFixed(3)),
    emptySystemProbability: Number(p0.toFixed(3)),
    meanQueueLength: Number(lq.toFixed(2)),
    meanOrdersInSystem: Number(l.toFixed(2)),
    baseWaitingTime: Number(baseWq.toFixed(2)),
    meanQueueWaitingTime: Number(kingmanWq.toFixed(2)),
    meanTotalTimeInSystem: Number(w.toFixed(2)),
    waitingBurdenRatio: Number(wbr.toFixed(3)),
    bufferMinutes,
    estimatedCompletionMinutes,
  };
}
