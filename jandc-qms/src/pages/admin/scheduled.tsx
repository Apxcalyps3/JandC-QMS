/**
 * Scheduled Telemetry Panel (Scheduled Channel)
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.3 & 6.2)
 * JANDC Internet Cafe and Services
 */

import { useState } from "react";
import {
  useListOrders,
  getListOrdersQueryKey,
  getGetQueueQueryKey,
  getGetOrderStatsQueryKey,
  useCreateOrder,
  useUpdateOrderStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { 
  CalendarClock, 
  Sparkles, 
  ArrowUpDown, 
  Clock, 
  Play, 
  PlusCircle, 
  CheckCircle2, 
  Layers, 
  FileText,
  SlidersHorizontal,
  Info,
  Package,
  Printer,
  Check,
  CheckSquare,
  Square,
  AlertTriangle
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  SchedulingHeuristic, 
  SCHEDULING_HEURISTICS, 
  ScheduledJob, 
  evaluateAndSortScheduledJobs 
} from "@/lib/scheduling-theory-engine";
import { usePrinterHardware } from "@/lib/printer-hardware-state";
import { formatOrderNumber } from "@/lib/workflow-rules";

export function ScheduledTelemetry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();
  const { printers, assignJobToPrinter, releasePrinterJob } = usePrinterHardware();

  const [selectedHeuristic, setSelectedHeuristic] = useState<SchedulingHeuristic>("ATC-P");
  const [stageFilter, setStageFilter] = useState<"all" | "pending" | "processing" | "for_pickup">("all");
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);

  // Pre-flight Go Signal modal state (SOP 5.1.1 & 5.1.3)
  const [goSignalJob, setGoSignalJob] = useState<ScheduledJob | null>(null);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [paperStockVerified, setPaperStockVerified] = useState<boolean>(true);
  const [tonerVerified, setTonerVerified] = useState<boolean>(true);
  const [trayClearVerified, setTrayClearVerified] = useState<boolean>(true);

  // Handover / Pickup Confirmation modal state
  const [handoverJob, setHandoverJob] = useState<ScheduledJob | null>(null);

  // New offline booking form state
  const [offlineName, setOfflineName] = useState("");
  const [offlinePaper, setOfflinePaper] = useState("A4");
  const [offlineColor, setOfflineColor] = useState("bw");
  const [offlinePages, setOfflinePages] = useState("20");
  const [offlineCopies, setOfflineCopies] = useState("1");
  const [offlinePickupDate, setOfflinePickupDate] = useState("");
  const [offlineAmount, setOfflineAmount] = useState("40");

  const { data: allOrders, isLoading } = useListOrders(
    {},
    {
      query: {
        queryKey: getListOrdersQueryKey({}),
        refetchInterval: 5000,
      },
    }
  );

  // Prepare scheduled candidates (orders not yet completed)
  const scheduledOrdersList: ScheduledJob[] = (allOrders || [])
    .filter((o) => o.status !== "completed")
    .map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      paperSize: o.paperSize || "Letter",
      printColor: o.printColor || "bw",
      pageCount: o.pageCount || 1,
      copies: o.copies || 1,
      totalAmount: (o as any).totalAmount || 0,
      pickupTime: o.pickupTime || new Date(Date.now() + 7200000).toISOString(),
      createdAt: o.createdAt,
      status: o.status,
      channel: (o as any).paymentMethod === "counter" ? "offline" : "online",
    }));

  const sortedJobs = evaluateAndSortScheduledJobs(scheduledOrdersList, selectedHeuristic);

  // Segment counts for production stages
  const pendingJobs = sortedJobs.filter((j) => j.status === "pending");
  const processingJobs = sortedJobs.filter((j) => j.status === "processing");
  const forPickupJobs = sortedJobs.filter(
    (j) => j.status === "for_pickup" || (j as any).status === "ready"
  );

  const displayedJobs = sortedJobs.filter((job) => {
    if (stageFilter === "pending") return job.status === "pending";
    if (stageFilter === "processing") return job.status === "processing";
    if (stageFilter === "for_pickup") {
      return job.status === "for_pickup" || (job as any).status === "ready";
    }
    return true;
  });

  const activeHeuristicMeta = SCHEDULING_HEURISTICS.find((h) => h.key === selectedHeuristic)!;

  const handleCreateOfflineOrder = () => {
    if (!offlineName.trim()) {
      toast({ title: "Name Required", description: "Please enter the client name.", variant: "destructive" });
      return;
    }

    const pages = Number(offlinePages) || 1;
    const copies = Number(offlineCopies) || 1;
    const amount = Number(offlineAmount) || 20;
    const nextNum = String(Math.floor(100 + Math.random() * 899));
    const pickupIso = offlinePickupDate
      ? new Date(offlinePickupDate).toISOString()
      : new Date(Date.now() + 4 * 3600000).toISOString();

    createOrder.mutate(
      {
        data: {
          customerName: offlineName.trim(),
          orderNumber: nextNum,
          paperSize: offlinePaper,
          printColor: offlineColor,
          pageCount: pages,
          copies: copies,
          totalAmount: amount,
          pickupTime: pickupIso,
          paymentMethod: "counter",
          serviceType: "printing",
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          toast({
            title: "Offline Scheduled Booking Logged",
            description: `Order #${nextNum} slotted into scheduled batch processing.`,
          });
          setOfflineModalOpen(false);
          setOfflineName("");
        },
      }
    );
  };

  // Pre-flight Go Signal opener
  const handleOpenGoSignal = (job: ScheduledJob) => {
    setGoSignalJob(job);
    setPaperStockVerified(true);
    setTonerVerified(true);
    setTrayClearVerified(true);
    const idlePrinter = printers.find((p) => p.status === "idle");
    setSelectedPrinterId(idlePrinter ? idlePrinter.id : printers[0]?.id || "");
  };

  // Authorize Go Signal: Transitions pending -> processing and assigns hardware printer
  const handleAuthorizeGoSignal = () => {
    if (!goSignalJob) return;
    const targetPrinter = printers.find((p) => p.id === selectedPrinterId);

    updateStatus.mutate(
      { id: goSignalJob.id, data: { status: "processing" } },
      {
        onSuccess: () => {
          assignJobToPrinter(goSignalJob.orderNumber);
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          toast({
            title: "Go Signal Authorized",
            description: `Order #${goSignalJob.orderNumber} initiated into active batch printing on ${targetPrinter?.name || "Printer Station"}.`,
          });
          setGoSignalJob(null);
        },
        onError: () => {
          toast({
            title: "Go Signal Failed",
            description: "Could not advance order to processing stage.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Move to Pickup: Transitions processing -> for_pickup and releases hardware printer
  const handleMarkForPickup = (job: ScheduledJob) => {
    updateStatus.mutate(
      { id: job.id, data: { status: "for_pickup" } },
      {
        onSuccess: () => {
          releasePrinterJob(job.orderNumber);
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          toast({
            title: "Order Staged for Pickup",
            description: `Order #${job.orderNumber} quality checked and staged in Holding Tray for customer pickup.`,
          });
        },
        onError: () => {
          toast({
            title: "Update Failed",
            description: "Could not stage order for pickup.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Customer Pickup Handover: Transitions for_pickup -> completed
  const handleConfirmPickupHandover = () => {
    if (!handoverJob) return;
    updateStatus.mutate(
      { id: handoverJob.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          toast({
            title: "Pickup Handover Completed",
            description: `Order #${handoverJob.orderNumber} collected by ${handoverJob.customerName}. Order logged to History.`,
          });
          setHandoverJob(null);
        },
        onError: () => {
          toast({
            title: "Handover Failed",
            description: "Could not finalize pickup handover.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Top bar Batch Dispatch: Trigger Go Signal on top priority pending job
  const handleExecuteBatch = () => {
    const topPending = sortedJobs.find((j) => j.status === "pending");
    if (topPending) {
      handleOpenGoSignal(topPending);
      toast({
        title: "Batch Sequence Dispatch",
        description: `Opening Pre-Flight Go Signal for #1 prioritized job #${topPending.orderNumber} under ${selectedHeuristic}.`,
      });
    } else {
      toast({
        title: "No Pending Scheduled Jobs",
        description: "All scheduled jobs in this batch are already in production or completed.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Scheduled Telemetry · Scheduled Channel
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              SOP 5.1.3 & 6.2
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Batch scheduling optimization engine with Pre-Flight Go Signals, printing execution, and pickup holding tray tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setOfflineModalOpen(true)}
            className="gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
          >
            <PlusCircle className="w-4 h-4" /> Book Offline Counter Schedule
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExecuteBatch}
            className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
          >
            <Play className="w-3.5 h-3.5 fill-current text-primary" /> 
            {pendingJobs.length > 0 ? `Go Signal Next (#${pendingJobs[0].orderNumber})` : "Batch Dispatch"}
          </Button>
        </div>
      </div>

      {/* Production Stage Summary Cards & Filter Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStageFilter("all")}
          className={`p-3 rounded-lg border text-left transition-all ${
            stageFilter === "all"
              ? "bg-card border-primary ring-2 ring-primary/20 shadow-xs"
              : "bg-card/60 hover:bg-card border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">All Scheduled</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black mt-1 text-foreground">{sortedJobs.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Total queued batch jobs</div>
        </button>

        <button
          type="button"
          onClick={() => setStageFilter("pending")}
          className={`p-3 rounded-lg border text-left transition-all ${
            stageFilter === "pending"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
              : "bg-card/60 hover:bg-card border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Awaiting Go Signal</span>
            <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">{pendingJobs.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Requires pre-flight start</div>
        </button>

        <button
          type="button"
          onClick={() => setStageFilter("processing")}
          className={`p-3 rounded-lg border text-left transition-all ${
            stageFilter === "processing"
              ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
              : "bg-card/60 hover:bg-card border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">In Printing Process</span>
            <Printer className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400">{processingJobs.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active on printer stations</div>
        </button>

        <button
          type="button"
          onClick={() => setStageFilter("for_pickup")}
          className={`p-3 rounded-lg border text-left transition-all ${
            stageFilter === "for_pickup"
              ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
              : "bg-card/60 hover:bg-card border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Ready for Pickup</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{forPickupJobs.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">In holding tray for handover</div>
        </button>
      </div>

      {/* Dynamic Order Sorting Engine Control Bar (SOP 5.1.3 & 6.2) */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                Priority Dispatching Heuristics Engine (7 Sorting Algorithms)
              </CardTitle>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              Current: {activeHeuristicMeta.label}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Select an algorithm to dynamically rearrange scheduled batch production based on setup costs, due dates, or urgency weights.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Heuristic Selection Buttons */}
          <div className="flex flex-wrap gap-2">
            {SCHEDULING_HEURISTICS.map((h) => {
              const isSelected = selectedHeuristic === h.key;
              return (
                <button
                  key={h.key}
                  onClick={() => setSelectedHeuristic(h.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {h.label}
                </button>
              );
            })}
          </div>

          {/* Active Heuristic Formulation Explainer */}
          <div className="p-3 rounded-lg border bg-muted/40 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{activeHeuristicMeta.fullName} ({activeHeuristicMeta.key})</span>
            </div>
            <p className="text-muted-foreground">{activeHeuristicMeta.description}</p>
            {selectedHeuristic === "ATC-P" && (
              <div className="font-mono text-[11px] text-primary/90 pt-1">
                Index formulation: I_j(t) = [w_j / (s_j + p_j)] · exp(-max(0, d_j - (t + s_j + p_j)) / (k·p̄)) · [1 + γ(p_j / p̄)]⁻¹
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Orders Sequence Table */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Batch Production Sequence</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {displayedJobs.length} {stageFilter === "all" ? "total jobs" : `${stageFilter} jobs`}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Prioritized under {activeHeuristicMeta.fullName}. Issue Go Signals to begin printing, move finished jobs to holding tray for pickup.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                SOP Section 6.2
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-12">Seq</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Paper / Mode</TableHead>
                <TableHead>Pages × Copies</TableHead>
                <TableHead>Setup / Proc</TableHead>
                <TableHead>Pickup Deadline</TableHead>
                <TableHead>Heuristic Index</TableHead>
                <TableHead>Stage Status</TableHead>
                <TableHead className="text-right">Production Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {displayedJobs.map((job, idx) => {
                const isForPickup = job.status === "for_pickup" || (job as any).status === "ready";
                const isProcessing = job.status === "processing";
                const isPending = job.status === "pending";

                return (
                  <TableRow key={job.id} className={isProcessing ? "bg-blue-500/5" : isForPickup ? "bg-emerald-500/5" : undefined}>
                    <TableCell className="font-black text-primary">
                      #{idx + 1}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        #{job.orderNumber}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {job.customerName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {job.channel === "offline" ? "Counter Walk-In" : "Online Pre-Order"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{job.paperSize}</span> ·{" "}
                      <span className={job.printColor === "color" ? "text-purple-700 font-medium" : "text-muted-foreground"}>
                        {job.printColor === "color" ? "Color" : "B&W"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {job.pageCount} pgs × {job.copies}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {job.setupMinutes}m / {job.processingMinutes}m
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-foreground">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{format(new Date(job.pickupTime), "MMM d, h:mm a")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {selectedHeuristic === "ATC-P" ? (
                        <span className="text-primary bg-primary/5 px-2 py-0.5 rounded text-[11px]">
                          ATC: {job.atcIndex}
                        </span>
                      ) : selectedHeuristic === "CP" ? (
                        <span className="text-blue-700 text-[11px]">
                          CR: {job.criticalRatio}
                        </span>
                      ) : selectedHeuristic === "SPT" || selectedHeuristic === "LPT" ? (
                        <span>{job.processingMinutes} min</span>
                      ) : (
                        <span className="text-muted-foreground">FIFO Seq</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isPending ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 text-[10px] font-semibold gap-1">
                          <Clock className="w-2.5 h-2.5" /> Awaiting Go Signal
                        </Badge>
                      ) : isProcessing ? (
                        <Badge className="bg-blue-600 text-white text-[10px] font-semibold gap-1 animate-pulse">
                          <Printer className="w-2.5 h-2.5" /> Printing Process
                        </Badge>
                      ) : isForPickup ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-semibold gap-1">
                          <Package className="w-2.5 h-2.5" /> Holding Tray (Pickup)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {job.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenGoSignal(job)}
                          className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold gap-1 shadow-xs"
                        >
                          <Play className="w-3 h-3 fill-current" /> Go Signal
                        </Button>
                      ) : isProcessing ? (
                        <Button
                          size="sm"
                          onClick={() => handleMarkForPickup(job)}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 shadow-xs"
                        >
                          <Package className="w-3 h-3" /> Move to Pickup
                        </Button>
                      ) : isForPickup ? (
                        <Button
                          size="sm"
                          onClick={() => setHandoverJob(job)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Customer Picked Up
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {displayedJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground text-xs">
                    {stageFilter === "all"
                      ? "No scheduled orders currently queued. Use 'Book Offline Counter Schedule' to slot future jobs."
                      : `No scheduled orders in "${stageFilter}" stage.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pre-Flight Go Signal Dialog (SOP Doc ID SOP-QMS-2026-001 Section 5.1.1 & 5.1.3) */}
      <Dialog open={!!goSignalJob} onOpenChange={(open) => !open && setGoSignalJob(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <DialogTitle>Issue Production Go Signal</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              SOP Section 5.1.1: Authorize scheduled batch order for print hardware processing.
            </DialogDescription>
          </DialogHeader>

          {goSignalJob && (
            <div className="space-y-4 py-1 text-xs">
              {/* Order Specification Summary */}
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-primary">
                    Order #{goSignalJob.orderNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {goSignalJob.channel === "offline" ? "Counter Walk-In" : "Online Pre-Order"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    <span className="text-foreground font-medium">Customer:</span> {goSignalJob.customerName}
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Stock:</span> {goSignalJob.paperSize} ({goSignalJob.printColor === "color" ? "Color" : "B&W"})
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Volume:</span> {goSignalJob.pageCount} pgs × {goSignalJob.copies} ({goSignalJob.pageCount * goSignalJob.copies} sheets)
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Est. Print:</span> {goSignalJob.setupMinutes + goSignalJob.processingMinutes} min
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1 border-t flex items-center gap-1">
                  <Clock className="w-3 h-3 text-primary" />
                  <span>Target Pickup: {format(new Date(goSignalJob.pickupTime), "PPP 'at' p")}</span>
                </div>
              </div>

              {/* Target Printer Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>Assign Printer Hardware Station</span>
                  <span className="text-[11px] text-muted-foreground">SOP Table 2</span>
                </label>
                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-2 text-xs font-medium"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.model}) — {p.status === "idle" ? "Idle / Ready" : p.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pre-Flight Checklist (SOP Section 5.1.1) */}
              <div className="space-y-2 rounded-lg border p-3 bg-background">
                <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  <span>Pre-Flight Quality Checklist</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={paperStockVerified}
                    onChange={(e) => setPaperStockVerified(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Paper size and tray confirmed matching ({goSignalJob.paperSize})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={tonerVerified}
                    onChange={(e) => setTonerVerified(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Toner and ink supply verified adequate for {goSignalJob.pageCount * goSignalJob.copies} sheets</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={trayClearVerified}
                    onChange={(e) => setTrayClearVerified(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Printer output tray clear of prior batches</span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGoSignalJob(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAuthorizeGoSignal}
              disabled={!paperStockVerified || !tonerVerified || !trayClearVerified || !selectedPrinterId}
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Authorize Go Signal & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Handover / Pickup Confirmation Dialog */}
      <Dialog open={!!handoverJob} onOpenChange={(open) => !open && setHandoverJob(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <DialogTitle>Confirm Scheduled Order Handover</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              SOP Section 5.2: Final handover verification before clearing order from active production.
            </DialogDescription>
          </DialogHeader>

          {handoverJob && (
            <div className="space-y-3 py-1 text-xs">
              <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-base text-primary">
                    Order #{handoverJob.orderNumber}
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    In Holding Tray
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-muted-foreground">
                  <div>
                    <span className="text-foreground font-medium">Customer:</span> {handoverJob.customerName}
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Channel:</span> {handoverJob.channel === "offline" ? "Counter Walk-In" : "Online Pre-Order"}
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Total Pages:</span> {handoverJob.pageCount * handoverJob.copies} sheets
                  </div>
                  <div>
                    <span className="text-foreground font-medium">Total Cost:</span> ₱{handoverJob.totalAmount}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Physical Holding Tray Confirmation</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                  Verify the physical printed batch from the holding tray against Order #{handoverJob.orderNumber} before handing to customer.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHandoverJob(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmPickupHandover}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Customer Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offline Scheduled Order Dialog (SOP Section 4 & 5.1.3) */}
      <Dialog open={offlineModalOpen} onOpenChange={setOfflineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" />
              <DialogTitle>Offline Counter Scheduled Booking</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              SOP Section 4: Log an in-person customer reservation for scheduled batch printing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Customer Name</label>
              <Input
                placeholder="e.g. Benjamin Gomez"
                value={offlineName}
                onChange={(e) => setOfflineName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Paper Stock</label>
                <select
                  value={offlinePaper}
                  onChange={(e) => setOfflinePaper(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="Letter">Letter (8.5 × 11)</option>
                  <option value="A4">A4 (8.27 × 11.69)</option>
                  <option value="Legal">Legal (8.5 × 14)</option>
                  <option value="Folio">Folio (8.5 × 13)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Color Mode</label>
                <select
                  value={offlineColor}
                  onChange={(e) => setOfflineColor(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-2 text-xs"
                >
                  <option value="bw">B&W Grayscale</option>
                  <option value="color">Full Color</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Page Count</label>
                <Input
                  type="number"
                  min="1"
                  value={offlinePages}
                  onChange={(e) => setOfflinePages(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Copies</label>
                <Input
                  type="number"
                  min="1"
                  value={offlineCopies}
                  onChange={(e) => setOfflineCopies(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Total (₱)</label>
                <Input
                  type="number"
                  min="1"
                  value={offlineAmount}
                  onChange={(e) => setOfflineAmount(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Target Pickup Date & Time</label>
              <Input
                type="datetime-local"
                value={offlinePickupDate}
                onChange={(e) => setOfflinePickupDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOfflineModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateOfflineOrder} className="font-bold">
              Save Scheduled Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
