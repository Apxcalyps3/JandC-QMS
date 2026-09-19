/**
 * Live Queue Telemetry Panel (Walk-In Channel)
 * Standard Operating Procedure Manual: Doc ID SOP-QMS-2026-001 (Section 5.1.2 & 6.1)
 * JANDC Internet Cafe and Services
 */

import { useState } from "react";
import {
  useGetQueue,
  getGetQueueQueryKey,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  useListOrders,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { 
  Activity, 
  Users, 
  Clock, 
  Timer, 
  TrendingUp, 
  Play, 
  CheckCircle2, 
  Check, 
  Layers, 
  FileText,
  Calculator,
  Info,
  Package
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { computeQueueTelemetry } from "@/lib/queue-telemetry-engine";
import { useAdminSettings } from "@/lib/admin-settings-state";

export function LiveQueue() {
  const { settings, updateSettings } = useAdminSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus();

  const { data: queue, isLoading: queueLoading } = useGetQueue({
    query: {
      queryKey: getGetQueueQueryKey(),
      refetchInterval: 5000,
    },
  });

  const { data: allOrders } = useListOrders(
    {},
    {
      query: {
        queryKey: getListOrdersQueryKey({}),
        refetchInterval: 5000,
      },
    }
  );

  const activeOrders = queue?.orders || [];
  // Walk-In filter (same-day orders)
  const walkInOrders = activeOrders.filter((o) => (o as any).serviceType !== "scheduled_batch");

  // Compute 21 queue telemetry variables
  const telemetry = computeQueueTelemetry({
    activeServers: settings.activeServers,
    activeOrderCount: walkInOrders.length,
    recentOrders: (allOrders || []).map((o) => ({
      createdAt: o.createdAt,
      processingStartedAt: (o as any).processingStartedAt,
      completedAt: (o as any).completedAt,
      pageCount: o.pageCount,
      copies: o.copies,
      estimatedMinutes: o.estimatedMinutes,
    })),
  });

  const handleToggleServers = (count: 1 | 2) => {
    updateSettings({ activeServers: count });
    toast({
      title: `Server Topology: ${count === 1 ? "G/G/1 (Single Operator)" : "G/G/2 (Dual Operators)"}`,
      description: `Telemetry equations updated for c = ${count} active staff counters.`,
    });
  };

  const handleGoSignal = (orderId: number, orderNum: string) => {
    updateStatus.mutate(
      { id: orderId, data: { status: "processing" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          toast({
            title: "Go Signal Triggered",
            description: `Walk-in Order #${orderNum} initiated into printing process.`,
          });
        },
      }
    );
  };

  const handleMarkForPickup = (orderId: number, orderNum: string) => {
    updateStatus.mutate(
      { id: orderId, data: { status: "for_pickup" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          toast({
            title: "Staged for Pickup",
            description: `Walk-in Order #${orderNum} placed in holding tray. Ready for customer handover.`,
          });
        },
      }
    );
  };

  const handleMarkCompleted = (orderId: number, orderNum: string) => {
    updateStatus.mutate(
      { id: orderId, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          toast({
            title: "Handover Completed",
            description: `Walk-in Order #${orderNum} marked finished.`,
          });
        },
      }
    );
  };

  const now = new Date();
  const estimatedCompletionTime = new Date(
    now.getTime() + telemetry.estimatedCompletionMinutes * 60000
  );

  return (
    <div className="space-y-6">
      {/* Header with Topology Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Live Queue Telemetry · Walk-In Channel
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              SOP 5.1.2 & 6.1
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time multi-server G/G/c queue telemetry engine governing in-person counter arrivals.
          </p>
        </div>

        {/* Server Topology Selector (c in {1, 2}) */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg border">
          <span className="text-xs font-semibold px-2 text-muted-foreground">Active Servers (c):</span>
          <Button
            size="sm"
            variant={settings.activeServers === 1 ? "default" : "ghost"}
            onClick={() => handleToggleServers(1)}
            className="h-7 text-xs font-bold px-2.5"
          >
            c = 1 (G/G/1)
          </Button>
          <Button
            size="sm"
            variant={settings.activeServers === 2 ? "default" : "ghost"}
            onClick={() => handleToggleServers(2)}
            className="h-7 text-xs font-bold px-2.5"
          >
            c = 2 (G/G/2)
          </Button>
        </div>
      </div>

      {/* SECTION 1: Key Dynamic Indicators (Section 6.1.2) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary hover:shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Queue Topology
            </CardTitle>
            <Calculator className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{telemetry.queueModel}</div>
            <p className="text-xs text-muted-foreground mt-1">
              c = {telemetry.activeServers} server{telemetry.activeServers > 1 ? "s" : ""} · General/General
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kingman Wait Time (Wq)
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {telemetry.meanQueueWaitingTime} min
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Variability factor: {((telemetry.arrivalCoefVariationSq + telemetry.serviceCoefVariationSq) / 2).toFixed(3)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Turnaround Time (W)
            </CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {telemetry.meanTotalTimeInSystem} min
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Wq + E[S] ({telemetry.expectedServiceTime}m service)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ETA (T_completion)
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">
              {format(estimatedCompletionTime, "h:mm a")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Includes {telemetry.bufferMinutes}m handling buffer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: 21 Core G/G/c Telemetry Matrix (Section 6.1.1) */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-bold">
                Analytical Telemetry Engine Matrix (21 Queuing Variables)
              </CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              SOP Section 6.1.1
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Live analytical values mathematically calculated from walk-in arrival timestamps and empirical service distributions.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            {/* Group A: Rates & Inter-Arrivals */}
            <div className="space-y-2 p-3 rounded-lg border bg-card/60">
              <div className="font-bold text-foreground border-b pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                1. Arrival & Service Rates
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Arrival (E[A]):</span>
                <span className="font-mono font-bold">{telemetry.expectedInterArrivalTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Service (E[S]):</span>
                <span className="font-mono font-bold">{telemetry.expectedServiceTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival Rate (λ):</span>
                <span className="font-mono font-bold">{telemetry.meanArrivalRate} /min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Rate (μ):</span>
                <span className="font-mono font-bold">{telemetry.meanServiceRate} /min</span>
              </div>
            </div>

            {/* Group B: Variance & Dispersion */}
            <div className="space-y-2 p-3 rounded-lg border bg-card/60">
              <div className="font-bold text-foreground border-b pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                2. Variance & Coefficients
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival Variance (σ_a²):</span>
                <span className="font-mono font-bold">{telemetry.varianceArrivalTimes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Variance (σ_s²):</span>
                <span className="font-mono font-bold">{telemetry.varianceServiceTimes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival Std Dev (σ_a):</span>
                <span className="font-mono font-bold">{telemetry.stdDevArrivalTimes} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Std Dev (σ_s):</span>
                <span className="font-mono font-bold">{telemetry.stdDevServiceTimes} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coeff. Variation (C_a², C_s²):</span>
                <span className="font-mono font-bold">
                  {telemetry.arrivalCoefVariationSq} / {telemetry.serviceCoefVariationSq}
                </span>
              </div>
            </div>

            {/* Group C: Load, Utilization & Probabilities */}
            <div className="space-y-2 p-3 rounded-lg border bg-card/60">
              <div className="font-bold text-foreground border-b pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                3. Load & Utilization
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offered Load (u = λ/μ):</span>
                <span className="font-mono font-bold">{telemetry.offeredLoad} Erlangs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mean Utilization (ρ_c):</span>
                <span className="font-mono font-bold text-primary">
                  {(telemetry.meanSystemUtilization * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Empty Probability (P_0):</span>
                <span className="font-mono font-bold">
                  {(telemetry.emptySystemProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mean Queue Length (L_q):</span>
                <span className="font-mono font-bold">{telemetry.meanQueueLength} orders</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total In System (L):</span>
                <span className="font-mono font-bold">{telemetry.meanOrdersInSystem} orders</span>
              </div>
            </div>

            {/* Group D: Kingman Heavy-Traffic & Burden */}
            <div className="space-y-2 p-3 rounded-lg border bg-card/60">
              <div className="font-bold text-foreground border-b pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                4. Kingman Approximations
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base M/M/c Wait (W_q):</span>
                <span className="font-mono font-bold">{telemetry.baseWaitingTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kingman W_q(G/G/{telemetry.activeServers}):</span>
                <span className="font-mono font-bold text-yellow-700">
                  {telemetry.meanQueueWaitingTime} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Turnaround Time (W):</span>
                <span className="font-mono font-bold">{telemetry.meanTotalTimeInSystem} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waiting Burden Ratio (WBR):</span>
                <span className="font-mono font-bold text-primary">
                  {(telemetry.waitingBurdenRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-[11px] pt-1 border-t text-muted-foreground">
                <span>Buffer Allowance:</span>
                <span className="font-mono">{telemetry.bufferMinutes} min</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Live Walk-In Order Specifications & Queue Progression */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Active Walk-In Queue ({walkInOrders.length} orders)
              </CardTitle>
              <CardDescription className="text-xs">
                SOP Section 5.1.2: Strict FIFO queue progression for standard walk-in document jobs.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-bold">
              Standard Documents Scope
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-16">Pos</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Paper Size</TableHead>
                <TableHead>Color Profile</TableHead>
                <TableHead>Pages / Copies</TableHead>
                <TableHead>Arrival Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {walkInOrders.map((order, idx) => (
                <TableRow key={order.id}>
                  <TableCell className="font-bold text-muted-foreground">
                    #{idx + 1}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      #{order.orderNumber}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {order.customerName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      {order.paperSize || "Letter"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] font-semibold ${
                        order.printColor === "color"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {order.printColor === "color" ? "Full Color" : "B&W Grayscale"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {order.pageCount || 1} pgs × {order.copies || 1}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(order.createdAt), "h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] uppercase font-bold ${
                        order.status === "processing"
                          ? "bg-blue-600 text-white"
                          : (order as any).status === "for_pickup"
                          ? "bg-emerald-600 text-white"
                          : "bg-yellow-500 text-yellow-950"
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {order.status === "pending" ? (
                      <Button
                        size="sm"
                        onClick={() => handleGoSignal(order.id, order.orderNumber)}
                        className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-bold gap-1 shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-current" /> Go Signal
                      </Button>
                    ) : order.status === "processing" ? (
                      <Button
                        size="sm"
                        onClick={() => handleMarkForPickup(order.id, order.orderNumber)}
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 shadow-xs"
                      >
                        <Package className="w-3 h-3" /> Move to Pickup
                      </Button>
                    ) : (order as any).status === "for_pickup" || (order as any).status === "ready" ? (
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(order.id, order.orderNumber)}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Mark Picked Up
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Completed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {walkInOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                    No active walk-in orders currently queued.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
