import { useState } from "react";
import { useGetQueue, getGetQueueQueryKey, useUpdateOrderStatus, getListOrdersQueryKey, useReorderQueue, useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMinutes, parseISO, isBefore, addMinutes } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle2, ArrowUp, ArrowDown, Calendar, Clock, List } from "lucide-react";
import { getNextOrderStatus } from "@/lib/workflow-rules";

type TabKey = "queue" | "schedule";

function PickupUrgencyBadge({ pickupTime }: { pickupTime?: string | null }) {
  if (!pickupTime) return <Badge variant="outline" className="text-muted-foreground">No pickup set</Badge>;
  const pickup = parseISO(pickupTime);
  const now = new Date();
  const minsUntil = differenceInMinutes(pickup, now);
  if (minsUntil < 0) return <Badge className="bg-gray-100 text-gray-600 border border-gray-200">Past due</Badge>;
  if (minsUntil <= 60) return <Badge className="bg-red-100 text-red-700 border border-red-200">Urgent — {minsUntil}m</Badge>;
  if (minsUntil <= 180) return <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Soon — {format(pickup, "h:mm a")}</Badge>;
  return <Badge className="bg-green-100 text-green-700 border border-green-200">{format(pickup, "h:mm a")}</Badge>;
}

export function Queue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("queue");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "urgent" | "standard">("all");

  const { data: queue, isLoading } = useGetQueue({
    query: { queryKey: getGetQueueQueryKey(), refetchInterval: 5000 }
  });

  const { data: allOrders } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), refetchInterval: 5000 } }
  );

  const updateStatus = useUpdateOrderStatus();
  const reorderQueue = useReorderQueue();

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
        toast({ title: "Status updated", description: `Order status changed to ${status}.` });
      }
    });
  };

  const handleReorder = (currentIndex: number, direction: "up" | "down") => {
    if (!queue) return;
    const pendingOrders = queue.orders.filter(o => o.status === "pending");
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === pendingOrders.length - 1) return;
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const newOrderIds = [...pendingOrders.map(o => o.id)];
    const temp = newOrderIds[currentIndex];
    newOrderIds[currentIndex] = newOrderIds[newIndex];
    newOrderIds[newIndex] = temp;
    reorderQueue.mutate({ data: { orderedIds: newOrderIds } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
        toast({ title: "Queue Reordered" });
      }
    });
  };

  const activeOrders = queue?.orders.filter(o => o.status === "pending" || o.status === "processing") || [];
  const pendingOrders = activeOrders.filter(o => o.status === "pending");

  // Schedule view: all active + recently completed orders with pickup times, sorted by pickup
  const scheduleOrders = (allOrders || [])
    .filter(o => o.pickupTime && o.status !== "cancelled")
    .sort((a, b) => {
      const ta = a.pickupTime ? new Date(a.pickupTime).getTime() : Infinity;
      const tb = b.pickupTime ? new Date(b.pickupTime).getTime() : Infinity;
      return ta - tb;
    });

  const filteredSchedule = scheduleOrders.filter((o) => {
    if (scheduleFilter === "all") return true;
    if (!o.pickupTime) return false;
    const pickup = parseISO(o.pickupTime);
    const now = new Date();
    const minsUntil = differenceInMinutes(pickup, now);
    if (scheduleFilter === "urgent") return minsUntil <= 60;
    if (scheduleFilter === "standard") return minsUntil > 60;
    return true;
  });

  function scheduleRowClass(order: NonNullable<typeof allOrders>[0]): string {
    if (order.status === "processing") return "bg-green-50/60 border-l-4 border-l-green-500";
    if (order.status === "completed") return "opacity-50";
    if (!order.pickupTime) return "";
    const minsUntil = differenceInMinutes(parseISO(order.pickupTime), new Date());
    if (minsUntil <= 60 && minsUntil >= 0) return "bg-red-50/60 border-l-4 border-l-red-500";
    if (minsUntil <= 180 && minsUntil >= 0) return "bg-amber-50/60 border-l-4 border-l-amber-400";
    return "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Queue Management</h1>
          <p className="text-muted-foreground">Manage the active line and scheduled pickup orders.</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("queue")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "queue" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="w-4 h-4" /> Active Queue
        </button>
        <button
          onClick={() => setTab("schedule")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "schedule" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" /> Schedule View
        </button>
      </div>

      {/* ── Active Queue tab ── */}
      {tab === "queue" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Active Queue</CardTitle>
              <CardDescription>Orders waiting and currently processing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Pos</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">Loading queue…</TableCell>
                      </TableRow>
                    ) : activeOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">Queue is empty.</TableCell>
                      </TableRow>
                    ) : (
                      activeOrders.map((order) => {
                        const pendingIndex = pendingOrders.findIndex(o => o.id === order.id);
                        return (
                          <TableRow key={order.id} className={order.status === "processing" ? "bg-blue-50/50" : ""}>
                            <TableCell className="font-bold">{order.queuePosition > 0 ? `#${order.queuePosition}` : "-"}</TableCell>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell className="capitalize">{order.serviceType.replace("-", " ")}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>
                              <PickupUrgencyBadge pickupTime={order.pickupTime} />
                            </TableCell>
                            <TableCell>
                              {order.status === "processing" ? (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 items-center">
                                {order.status === "pending" && (
                                  <div className="flex flex-col gap-0 border rounded overflow-hidden mr-2">
                                    <button
                                      className="p-1 hover:bg-muted disabled:opacity-30"
                                      disabled={pendingIndex === 0}
                                      onClick={() => handleReorder(pendingIndex, "up")}
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      className="p-1 hover:bg-muted disabled:opacity-30"
                                      disabled={pendingIndex === pendingOrders.length - 1}
                                      onClick={() => handleReorder(pendingIndex, "down")}
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                {getNextOrderStatus(order.status) === "processing" ? (
                                  <Button size="sm" onClick={() => handleStatusChange(order.id, "processing")}>
                                    <Play className="w-3 h-3 mr-1" /> Process
                                  </Button>
                                ) : getNextOrderStatus(order.status) === "completed" ? (
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleStatusChange(order.id, "completed")}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Queue Status</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Live queue · refreshes every 5 seconds
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Active Count</div>
                  <div className="text-4xl font-black">{queue?.activeCount || 0}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Avg Wait Time</div>
                  <div className="text-3xl font-bold">{Math.round(queue?.avgWaitMinutes || 0)} min</div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* ── Schedule View tab ── */}
      {tab === "schedule" && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex gap-2">
            {(["all", "urgent", "standard"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setScheduleFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                  scheduleFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                {f === "all" ? "All" : f === "urgent" ? "Urgent (< 1h)" : "Standard"}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Deadline-Driven Schedule
              </CardTitle>
              <CardDescription>Orders sorted by pickup time. Red = urgent, yellow = standard, green = processing.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Pickup Time</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedule.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                          No orders with scheduled pickup times.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchedule.map((order) => (
                        <TableRow key={order.id} className={scheduleRowClass(order)}>
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell className="capitalize">{order.serviceType.replace("-", " ")}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">
                                {order.pickupTime ? format(parseISO(order.pickupTime), "h:mm a") : "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {order.pickupTime ? format(parseISO(order.pickupTime), "MMM d") : ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <PickupUrgencyBadge pickupTime={order.pickupTime} />
                          </TableCell>
                          <TableCell>
                            {order.status === "processing" ? (
                              <Badge className="bg-green-100 text-green-800 border border-green-200">Processing</Badge>
                            ) : order.status === "completed" ? (
                              <Badge className="bg-gray-100 text-gray-600 border border-gray-200">Done</Badge>
                            ) : order.status === "pending" ? (
                              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">Pending</Badge>
                            ) : (
                              <Badge variant="outline">{order.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => handleStatusChange(order.id, "processing")}>
                                <Play className="w-3 h-3 mr-1" /> Process
                              </Button>
                            )}
                            {order.status === "processing" && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleStatusChange(order.id, "completed")}>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
