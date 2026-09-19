/**
 * Home Panel (Real-Time Control Center)
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.1 & 5.2)
 * JANDC Internet Cafe and Services
 */

import { useState } from "react";
import {
  useGetOrderStats,
  getGetOrderStatsQueryKey,
  useGetQueue,
  getGetQueueQueryKey,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  useListOrders,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { 
  Printer, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  QrCode, 
  Check, 
  FileText,
  Volume2
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePrinterHardware, PrinterHardware, playOrderAlertChime } from "@/lib/printer-hardware-state";
import { useAdminSettings } from "@/lib/admin-settings-state";

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetOrderStats({
    query: {
      queryKey: getGetOrderStatsQueryKey(),
      refetchInterval: 5000,
    },
  });

  const { data: allOrders, isLoading: ordersLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), refetchInterval: 5000 } }
  );

  const {
    printers,
    simulateError,
    resolveError,
    reRouteJob,
    assignJobToPrinter,
    releasePrinterJob,
  } = usePrinterHardware();

  const { settings } = useAdminSettings();
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Pre-flight dialog state
  const [preFlightOrder, setPreFlightOrder] = useState<any | null>(null);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [paperStockVerified, setPaperStockVerified] = useState<boolean>(false);
  const [specsVerified, setSpecsVerified] = useState<boolean>(false);

  // Handover / QR Token Verification state (SOP 5.2 Step 5)
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverTokenInput, setHandoverTokenInput] = useState("");
  const [verifiedOrder, setVerifiedOrder] = useState<any | null>(null);

  const orders = allOrders || [];
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const processingOrders = orders.filter((o) => o.status === "processing");
  const forPickupOrders = orders.filter(
    (o) => (o as any).status === "for_pickup" || (o as any).status === "ready"
  );
  const completedOrders = orders.filter((o) => o.status === "completed").slice(0, 8);

  const handleOpenPreFlight = (order: any) => {
    setPreFlightOrder(order);
    setPaperStockVerified(false);
    setSpecsVerified(false);
    // Suggest first idle printer matching color or size
    const matching = printers.find((p) => p.status === "idle");
    setSelectedPrinterId(matching ? matching.id : printers[0]?.id || "");
  };

  const handleIssueGoSignal = () => {
    if (!preFlightOrder) return;
    const orderId = preFlightOrder.id;

    updateStatus.mutate(
      { id: orderId, data: { status: "processing" } },
      {
        onSuccess: () => {
          assignJobToPrinter(preFlightOrder.orderNumber);
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          toast({
            title: "Go Signal Issued",
            description: `Order #${preFlightOrder.orderNumber} sent to printer station. In printing process.`,
          });
          setPreFlightOrder(null);
        },
        onError: () => {
          toast({
            title: "Command Failed",
            description: "Could not start printing process.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleMarkForPickup = (order: any) => {
    updateStatus.mutate(
      { id: order.id, data: { status: "for_pickup" } },
      {
        onSuccess: () => {
          releasePrinterJob(order.orderNumber);
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          toast({
            title: "Order Ready for Pickup",
            description: `Order #${order.orderNumber} quality-checked and placed in holding tray. Automated notification triggered.`,
          });
        },
      }
    );
  };

  const handleExecuteFinishedOrder = (order: any) => {
    updateStatus.mutate(
      { id: order.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
          toast({
            title: "Order Finished & Handed Over",
            description: `Order #${order.orderNumber} completed. Archived to History Panel.`,
          });
          setHandoverModalOpen(false);
          setHandoverTokenInput("");
          setVerifiedOrder(null);
        },
      }
    );
  };

  const handleLookupHandoverToken = (token: string) => {
    setHandoverTokenInput(token);
    const cleaned = token.trim();
    if (cleaned.length === 3) {
      const match = forPickupOrders.find(
        (o) => String(o.orderNumber).padStart(3, "0") === cleaned
      );
      setVerifiedOrder(match || null);
    } else {
      setVerifiedOrder(null);
    }
  };

  const handleReRoute = (printerId: string) => {
    const target = reRouteJob(printerId);
    if (target) {
      toast({
        title: "Job Re-Routed",
        description: `Active job re-routed successfully to ${target.name} (${target.model}).`,
      });
    } else {
      toast({
        title: "Re-Route Failed",
        description: "No idle secondary printer available with matching paper specifications.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-Time Control Center Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Home Panel · Real-Time Control Center
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              SOP 5.1.1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Standard Operating Procedure control center for live hardware telemetry, pre-flight go-signals, and counter handover.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              playOrderAlertChime();
              toast({ title: "Audio Test", description: "Incoming order chime test emitted." });
            }}
            className="gap-1.5 text-xs"
            title="Test audio alert chime"
          >
            <Volume2 className="w-3.5 h-3.5 text-primary" /> Audio Chime Test
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setHandoverModalOpen(true);
              setHandoverTokenInput("");
              setVerifiedOrder(null);
            }}
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <QrCode className="w-3.5 h-3.5" /> Handover / Token Scan
          </Button>
        </div>
      </div>

      {/* SECTION 1: Hardware Telemetry Monitors (SOP 5.1.1 & Table 2) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Standard Printer Hardware Monitors
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            3 Connected Stations · Paper Trays: Letter, A4, Legal, Folio
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {printers.map((p) => {
            const isPrinting = p.status === "printing";
            const isError = p.status === "in_error";

            return (
              <Card
                key={p.id}
                className={`border transition-all ${
                  isError
                    ? "border-red-500 bg-red-50/20"
                    : isPrinting
                    ? "border-blue-500 bg-blue-50/15"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.model}</div>
                    </div>
                    {isError ? (
                      <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
                        In Error
                      </Badge>
                    ) : isPrinting ? (
                      <Badge className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider animate-pulse">
                        Printing
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] uppercase font-bold tracking-wider">
                        Idle / Ready
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-dashed">
                    <span>Paper Trays: {p.trays.join(", ")}</span>
                    <span>{p.ppm} PPM</span>
                  </div>

                  {isPrinting && (
                    <div className="p-2 rounded-md bg-blue-100/60 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                      <span className="font-medium">Active Job: #{p.currentOrderId || "Standard"}</span>
                      <span className="animate-spin text-blue-600">●</span>
                    </div>
                  )}

                  {isError && (
                    <div className="p-2 rounded-md bg-red-100/80 border border-red-200 text-xs text-red-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-red-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{p.errorDescription || "Hardware fault"}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReRoute(p.id)}
                          className="h-7 text-xs flex-1"
                        >
                          Re-Route Job
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveError(p.id)}
                          className="h-7 text-xs bg-white text-slate-800"
                        >
                          Clear Fault
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isError && (
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
                      <span>Printed today: {p.printedPagesToday} pages</span>
                      <button
                        onClick={() => simulateError(p.id, "paper_jam")}
                        className="text-[10px] text-muted-foreground hover:text-amber-700 hover:underline"
                        title="Simulate paper jam to test SOP Table 2 exception re-routing"
                      >
                        [Simulate Jam]
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Active Order Volume Metrics (SOP 5.1.1 - 3 Production Stages) */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Active Production Stages (SOP 5.1.1)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stage 1: In Queue */}
          <Card className="border-l-4 border-l-yellow-500 hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Orders in Queue
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{pendingOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting pre-flight Go Signal</p>
            </CardContent>
          </Card>

          {/* Stage 2: In Printing Process */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. In Printing Process
              </CardTitle>
              <Printer className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{processingOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active at printing stations</p>
            </CardContent>
          </Card>

          {/* Stage 3: For Pickup */}
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. For Pickup
              </CardTitle>
              <Package className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-700">{forPickupOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready in holding tray for handover</p>
            </CardContent>
          </Card>

          {/* Completed Lifecycle Today */}
          <Card className="border-l-4 border-l-slate-400 hover:shadow-xs transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Completed (History)
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{completedOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished & archived today</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: The 3 Production Stages Interactive Workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* STAGE 1: Current Orders in Queue (Pre-Flight Go-Signal System) */}
        <Card className="border shadow-xs flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
                Queue · Awaiting Go Signal
              </CardTitle>
              <Badge variant="secondary" className="font-bold">
                {pendingOrders.length}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              SOP Step 2: Verify paper stock tray, then issue manual Go Signal.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3 space-y-3 flex-1 overflow-auto max-h-[580px]">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="border border-border/80 hover:border-primary/40 transition-all">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                          {order.customerName}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        {format(new Date(order.createdAt), "h:mm a")} · {order.files?.[0]?.name || "Document.pdf"}
                      </span>
                    </div>

                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                      {order.paperSize || "Letter"}
                    </Badge>
                  </div>

                  {/* Specifications Badge row */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-muted font-medium text-foreground">
                      {order.pageCount || 1} pgs × {order.copies || 1} cpy
                    </span>
                    <span className={`px-1.5 py-0.5 rounded font-medium ${order.printColor === "color" ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-800"}`}>
                      {order.printColor === "color" ? "Full Color" : "B&W Grayscale"}
                    </span>
                    {(order as any).paymentStatus === "verified" ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                        Paid ₱{(order as any).totalAmount}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                        Counter: ₱{(order as any).totalAmount}
                      </span>
                    )}
                  </div>

                  {/* Pre-Flight & Manual Go Signal Trigger */}
                  <Button
                    size="sm"
                    onClick={() => handleOpenPreFlight(order)}
                    className="w-full text-xs font-semibold gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                  >
                    <Play className="w-3 h-3 fill-current" /> Pre-Flight & Go Signal
                  </Button>
                </CardContent>
              </Card>
            ))}

            {pendingOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No orders waiting in queue.
              </div>
            )}
          </CardContent>
        </Card>

        {/* STAGE 2: In Printing Process */}
        <Card className="border shadow-xs flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                In Printing Process
              </CardTitle>
              <Badge className="bg-blue-600 font-bold">
                {processingOrders.length}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              SOP Step 4: Quality-check print output and place in holding tray.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3 space-y-3 flex-1 overflow-auto max-h-[580px]">
            {processingOrders.map((order) => (
              <Card key={order.id} className="border border-blue-200 bg-blue-50/10">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                          {order.customerName}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Started: {format(new Date((order as any).processingStartedAt || order.updatedAt), "h:mm a")}
                      </span>
                    </div>

                    <Badge className="bg-blue-600 text-white text-[10px] animate-pulse">
                      Printing
                    </Badge>
                  </div>

                  <div className="p-2 rounded bg-muted/60 text-xs flex justify-between items-center text-muted-foreground">
                    <span>
                      {order.paperSize || "Letter"} · {order.pageCount || 1} pgs · {order.printColor === "color" ? "Color" : "B&W"}
                    </span>
                    <span className="font-bold text-foreground">₱{(order as any).totalAmount}</span>
                  </div>

                  {/* Quality check & Mark For Pickup */}
                  <Button
                    size="sm"
                    onClick={() => handleMarkForPickup(order)}
                    className="w-full text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Check className="w-3.5 h-3.5" /> Quality Checked → Mark For Pickup
                  </Button>
                </CardContent>
              </Card>
            ))}

            {processingOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No active print jobs in process.
              </div>
            )}
          </CardContent>
        </Card>

        {/* STAGE 3: For Pickup (Holding Tray & Counter Handover) */}
        <Card className="border shadow-xs flex flex-col">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                For Pickup · Holding Tray
              </CardTitle>
              <Badge className="bg-emerald-600 font-bold">
                {forPickupOrders.length}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              SOP Step 5: Verify customer token QR code, hand over, and Mark Finished.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3 space-y-3 flex-1 overflow-auto max-h-[580px]">
            {forPickupOrders.map((order) => (
              <Card key={order.id} className="border border-emerald-200 bg-emerald-50/15">
                <CardContent className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                          {order.customerName}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Holding tray: Tray Bin #{order.id} · Ready
                      </span>
                    </div>

                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                      Ready for Pickup
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center text-xs p-2 rounded bg-white/70 border">
                    <span className="text-muted-foreground">
                      {order.paperSize} · {order.copies || 1} set ({order.pageCount} pgs)
                    </span>
                    <span className="font-bold text-emerald-700">₱{(order as any).totalAmount}</span>
                  </div>

                  {/* Mark Finished Command */}
                  <Button
                    size="sm"
                    onClick={() => handleExecuteFinishedOrder(order)}
                    className="w-full text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Handover & Mark Finished
                  </Button>
                </CardContent>
              </Card>
            ))}

            {forPickupOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                No orders currently in the holding tray.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pre-Flight Go-Signal Verification Dialog (SOP 5.1.1 & 5.2 Step 2) */}
      <Dialog open={!!preFlightOrder} onOpenChange={(open) => !open && setPreFlightOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <DialogTitle>Pre-Flight Verification Checklist</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              SOP Section 5.1.1: Print orders require explicit manual admin confirmation before production starts.
            </DialogDescription>
          </DialogHeader>

          {preFlightOrder && (
            <div className="space-y-4 py-2">
              {/* Order Summary banner */}
              <div className="p-3 rounded-lg bg-muted/60 border text-xs space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Order #{preFlightOrder.orderNumber}</span>
                  <span className="text-primary font-mono">{preFlightOrder.customerName}</span>
                </div>
                <div className="text-muted-foreground">
                  File: <span className="font-medium text-foreground">{preFlightOrder.files?.[0]?.name || "Document.pdf"}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t">
                  <span>
                    Paper: <strong>{preFlightOrder.paperSize || "Letter"}</strong> · Mode: <strong>{preFlightOrder.printColor === "color" ? "Full Color" : "B&W"}</strong>
                  </span>
                  <span>
                    <strong>{preFlightOrder.pageCount || 1}</strong> pgs × <strong>{preFlightOrder.copies || 1}</strong> cpy
                  </span>
                </div>
              </div>

              {/* Station Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target Printer Station</label>
                <select
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border bg-background px-3"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.status === "in_error"}>
                      {p.name} ({p.model}) - Trays: {p.trays.join(", ")} [{p.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Checklist checkboxes */}
              <div className="space-y-2 border-t pt-3">
                <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paperStockVerified}
                    onChange={(e) => setPaperStockVerified(e.target.checked)}
                    className="mt-0.5 rounded border-muted-foreground"
                  />
                  <span>
                    <strong>Paper Stock Verified:</strong> Target tray confirmed stocked with{" "}
                    <span className="text-primary font-bold">{preFlightOrder.paperSize || "Letter"}</span> paper.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specsVerified}
                    onChange={(e) => setSpecsVerified(e.target.checked)}
                    className="mt-0.5 rounded border-muted-foreground"
                  />
                  <span>
                    <strong>Pre-Flight Specs Checked:</strong> Margins, color profile, and page bounds verified without clipping.
                  </span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setPreFlightOrder(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!paperStockVerified || !specsVerified}
              onClick={handleIssueGoSignal}
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Issue Manual Go Signal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover & Token QR Verification Modal (SOP 5.2 Step 5) */}
      <Dialog open={handoverModalOpen} onOpenChange={setHandoverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <DialogTitle>Counter Handover & Token Verification</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              SOP Section 5.2 Step 5: Scan or enter the customer's 3-digit order number / digital token QR code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">3-Digit Order Number / Token</label>
              <Input
                placeholder="e.g. 104"
                maxLength={3}
                value={handoverTokenInput}
                onChange={(e) => handleLookupHandoverToken(e.target.value.replace(/\D/g, ""))}
                className="text-center font-mono text-2xl tracking-widest font-black h-12"
                autoFocus
              />
            </div>

            {verifiedOrder ? (
              <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-emerald-800">
                    Order #{verifiedOrder.orderNumber}
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    Status: {verifiedOrder.status}
                  </Badge>
                </div>

                <div className="text-xs space-y-1">
                  <div>Customer: <strong>{verifiedOrder.customerName}</strong></div>
                  <div>
                    Specifications: {verifiedOrder.paperSize} · {verifiedOrder.pageCount} pgs × {verifiedOrder.copies} cpy
                  </div>
                  <div className="font-bold text-emerald-700">Total Amount: ₱{(verifiedOrder as any).totalAmount}</div>
                </div>

                <Button
                  onClick={() => handleExecuteFinishedOrder(verifiedOrder)}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm Handover & Mark Finished
                </Button>
              </div>
            ) : handoverTokenInput.length === 3 ? (
              <div className="p-3 text-center text-xs text-amber-800 bg-amber-50 rounded border border-amber-200">
                No ready order in holding tray matching #{handoverTokenInput}.
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-muted-foreground bg-muted/40 rounded">
                Available in holding tray:{" "}
                {forPickupOrders.map((o) => `#${o.orderNumber}`).join(", ") || "None"}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHandoverModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
