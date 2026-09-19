/**
 * Scheduling Theory Engine (Scheduled Orders)
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.3 & 6.2)
 * JANDC Internet Cafe and Services
 */

export type SchedulingHeuristic =
  | "ATC-P"
  | "EDD"
  | "CP"
  | "SPT"
  | "LPT"
  | "FCFS"
  | "LCFS";

export interface ScheduledJob {
  id: number;
  orderNumber: string;
  customerName: string;
  paperSize?: string;
  printColor?: string;
  pageCount: number;
  copies: number;
  totalAmount: number;
  pickupTime: string;
  createdAt: string;
  status: string;
  channel?: "online" | "offline";
  // Evaluated attributes
  urgencyWeight?: number; // w_j
  setupMinutes?: number;   // s_j
  processingMinutes?: number; // p_j
  atcIndex?: number;       // I^{PSP}_j(t)
  criticalRatio?: number;
  slackMinutes?: number;
}

export interface HeuristicMetadata {
  key: SchedulingHeuristic;
  label: string;
  fullName: string;
  description: string;
}

export const SCHEDULING_HEURISTICS: HeuristicMetadata[] = [
  {
    key: "ATC-P",
    label: "ATC-P (Default)",
    fullName: "Apparent Tardiness Cost for Print Shops",
    description:
      "Primary algorithmic dispatch balancing setup time, urgency weight, page count, and pickup deadlines.",
  },
  {
    key: "EDD",
    label: "EDD",
    fullName: "Earliest Due Date",
    description: "Sorts scheduled jobs by closest customer pickup deadline timestamp.",
  },
  {
    key: "CP",
    label: "CP / CR",
    fullName: "Critical Path / Critical Ratio",
    description: "Prioritizes jobs with lowest remaining slack time relative to print duration.",
  },
  {
    key: "SPT",
    label: "SPT",
    fullName: "Shortest Processing Time",
    description: "Sorts jobs from smallest print duration/page count to largest for fast turnaround.",
  },
  {
    key: "LPT",
    label: "LPT",
    fullName: "Longest Processing Time",
    description: "Sorts jobs from largest print duration to smallest.",
  },
  {
    key: "FCFS",
    label: "FCFS",
    fullName: "First-Come, First-Served",
    description: "Sorts strictly in order of booking submission timestamp.",
  },
  {
    key: "LCFS",
    label: "LCFS",
    fullName: "Last-Come, First-Served",
    description: "Sorts jobs in reverse order of submission.",
  },
];

export function evaluateAndSortScheduledJobs(
  jobs: ScheduledJob[],
  heuristic: SchedulingHeuristic = "ATC-P",
  currentTimeMs: number = Date.now(),
  nominalPPM: number = 20
): ScheduledJob[] {
  if (jobs.length === 0) return [];

  // Calibration parameters per SOP 6.2
  const k = 2.0; // Calibrated look-ahead parameter
  const gamma = 0.5; // Page density / scaling factor

  // 1. Calculate job attributes
  const enriched: ScheduledJob[] = jobs.map((job) => {
    const totalPages = (job.pageCount || 1) * (job.copies || 1);
    const p_j = Math.max(0.5, totalPages / nominalPPM);

    // Setup time s_j based on paper size & color
    let s_j = 0.5; // Default Letter/A4
    if (job.paperSize === "Legal") s_j = 1.0;
    if (job.paperSize === "Folio") s_j = 1.2;
    if (job.printColor === "color") s_j += 0.5;

    // Due date in minutes from now
    const pickupMs = new Date(job.pickupTime).getTime();
    const d_j_minutes = (pickupMs - currentTimeMs) / 60000;

    // Urgency weight w_j based on deadline proximity
    let w_j = 1.0;
    if (d_j_minutes < 60) w_j = 3.0;
    else if (d_j_minutes < 180) w_j = 2.0;
    else if (d_j_minutes < 360) w_j = 1.5;

    const slack = d_j_minutes - (s_j + p_j);
    const criticalRatio = (s_j + p_j) > 0 ? d_j_minutes / (s_j + p_j) : 1;

    return {
      ...job,
      urgencyWeight: w_j,
      setupMinutes: Number(s_j.toFixed(2)),
      processingMinutes: Number(p_j.toFixed(2)),
      slackMinutes: Number(slack.toFixed(1)),
      criticalRatio: Number(criticalRatio.toFixed(2)),
    };
  });

  // 2. Average processing time across all scheduled jobs in batch
  const sumP = enriched.reduce((sum, j) => sum + (j.processingMinutes || 1), 0);
  const pBar = Math.max(0.5, sumP / enriched.length);

  // 3. Compute ATC-P index for each job
  enriched.forEach((j) => {
    const s_j = j.setupMinutes || 0.5;
    const p_j = j.processingMinutes || 1.0;
    const w_j = j.urgencyWeight || 1.0;
    const pickupMs = new Date(j.pickupTime).getTime();
    const d_j_min = (pickupMs - currentTimeMs) / 60000;

    const slackTerm = Math.max(0, d_j_min - (s_j + p_j));
    const exponent = -slackTerm / (k * pBar);
    const scaling = Math.pow(1 + gamma * (p_j / pBar), -1);

    const atc = (w_j / (s_j + p_j)) * Math.exp(exponent) * scaling;
    j.atcIndex = Number(atc.toFixed(4));
  });

  // 4. Sort according to the requested heuristic
  const sorted = [...enriched];

  switch (heuristic) {
    case "ATC-P":
      // Higher ATC-P index = higher execution priority
      sorted.sort((a, b) => (b.atcIndex || 0) - (a.atcIndex || 0));
      break;

    case "EDD":
      // Earliest pickup date/time first
      sorted.sort(
        (a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime()
      );
      break;

    case "CP":
      // Lowest critical ratio / slack time first
      sorted.sort((a, b) => (a.criticalRatio || 0) - (b.criticalRatio || 0));
      break;

    case "SPT":
      // Shortest processing time first
      sorted.sort((a, b) => (a.processingMinutes || 0) - (b.processingMinutes || 0));
      break;

    case "LPT":
      // Longest processing time first
      sorted.sort((a, b) => (b.processingMinutes || 0) - (a.processingMinutes || 0));
      break;

    case "FCFS":
      // Oldest submission first
      sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      break;

    case "LCFS":
      // Newest submission first
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
  }

  return sorted;
}
