import {
  useGetOrderStats,
  getGetOrderStatsQueryKey,
  useGetQueue,
  getGetQueueQueryKey,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
  useListOrders,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CheckCircle2, Clock, Package, Play, Printer, Activity, CreditCard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetOrderStats({
    query: {
      queryKey: getGetOrderStatsQueryKey(),
      refetchInterval: 5000
    }
  });

  const { data: queue, isLoading: queueLoading } = useGetQueue({
    query: {
      queryKey: getGetQueueQueryKey(),
      refetchInterval: 5000
    }
  });

  // Completed orders fetched directly (queue only returns active orders)
  const { data: completedOrders } = useListOrders(
    { status: "completed" },
    { query: { queryKey: getListOrdersQueryKey({ status: "completed" }), refetchInterval: 5000 } }
  );

  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (id: number, status: string) => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetOrderStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ status: "completed" }) });
        toast({ title: "Status updated", description: `Order status changed to ${status}.` });
      },
      onError: () => {
        toast({ title: "Update failed", description: "Failed to update order status.", variant: "destructive" });
      }
    });
  };

  const pending = queue?.orders.filter(o => o.status === "pending") || [];
  const processing = queue?.orders.filter(o => o.status === "processing") || [];
  const completed = (completedOrders || []).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Today’s work</h1>
          <p className="mt-1 text-sm text-muted-foreground">Move orders from waiting to ready with the next clear action.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.todayTotal || 0}</div>
            <p className="text-xs text-muted-foreground">Total orders placed today</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Waiting to be processed</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsLoading ? "-" : stats?.processing || 0}</div>
            <p className="text-xs text-muted-foreground">Currently being worked on</p>
          </CardContent>
        </Card>
        <Card className={`hover-elevate ${stats?.pendingPayment ? "border-amber-300 bg-amber-50/40" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Review</CardTitle>
            <CreditCard className={`h-4 w-4 ${stats?.pendingPayment ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.pendingPayment ? "text-amber-600" : ""}`}>
              {statsLoading ? "-" : stats?.pendingPayment || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment verification</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Pending Column */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" /> Pending ({pending.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Start the next job in line.</p>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-auto">
            {pending.map(order => (
              <Card key={order.id} className={`border-l-4 ${(order as any).paymentMethod === "counter" ? "border-l-primary" : "border-l-yellow-500"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold block">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "h:mm a")}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline">{order.serviceType}</Badge>
                      {(order as any).paymentMethod === "counter" && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Priority</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm">{order.customerName}</div>
                  {order.pickupTime && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pickup: {format(new Date(order.pickupTime), "h:mm a")}
                    </div>
                  )}
                  {(order as any).totalAmount > 0 && (
                    <div className="text-xs font-semibold text-primary">₱{(order as any).totalAmount}</div>
                  )}
                  {order.paymentStatus === "pending" && (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">Payment pending</Badge>
                  )}
                  {order.paymentStatus === "verified" && (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px]">Payment verified</Badge>
                  )}
                  {order.paymentStatus === "counter" && (
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px]">Counter payment</Badge>
                  )}
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleStatusChange(order.id, "processing")}
                      disabled={updateStatus.isPending}
                    >
                      <Play className="w-3 h-3 mr-1" /> Process
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pending.length === 0 && !queueLoading && (
              <div className="text-center text-muted-foreground p-8 text-sm">No pending orders.</div>
            )}
          </CardContent>
        </Card>

        {/* Processing Column */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Processing ({processing.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Finish jobs currently at the printer.</p>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-auto">
            {processing.map(order => (
              <Card key={order.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold block">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "h:mm a")}</span>
                    </div>
                    <Badge variant="outline">{order.serviceType}</Badge>
                  </div>
                  <div className="text-sm">{order.customerName}</div>
                  {order.pickupTime && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pickup: {format(new Date(order.pickupTime), "h:mm a")}
                    </div>
                  )}
                  {(order as any).totalAmount > 0 && (
                    <div className="text-xs font-semibold text-primary">₱{(order as any).totalAmount}</div>
                  )}
                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleStatusChange(order.id, "completed")}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {processing.length === 0 && !queueLoading && (
              <div className="text-center text-muted-foreground p-8 text-sm">No active processing.</div>
            )}
          </CardContent>
        </Card>

        {/* Completed Column */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Completed
            </CardTitle>
            <p className="text-xs text-muted-foreground">Recently finished orders.</p>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-auto">
            {completed.map(order => (
              <Card key={order.id} className="border-l-4 border-l-green-500 opacity-80">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold block">{order.orderNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date((order as any).completedAt || order.updatedAt || order.createdAt), "h:mm a")}
                      </span>
                    </div>
                    <Badge variant="outline">{order.serviceType}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{order.customerName}</div>
                  {(order as any).totalAmount > 0 && (
                    <div className="text-xs font-semibold text-green-700">₱{(order as any).totalAmount}</div>
                  )}
                </CardContent>
              </Card>
            ))}
            {completed.length === 0 && (
              <div className="text-center text-muted-foreground p-8 text-sm">No completed orders yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
