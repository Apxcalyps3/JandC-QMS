import { useState } from "react";
import {
  useListOrders,
  getListOrdersQueryKey,
  useVerifyOrderPayment,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  CreditCard,
  Eye,
  FileText,
  Banknote,
  Smartphone,
} from "lucide-react";

type VerifyAction = "approve" | "reject";
type TabKey = "pending" | "counter" | "verified" | "rejected" | "all";

function PaymentStatusBadge({ status, method }: { status: string; method?: string }) {
  if (method === "counter" || status === "counter")
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">Counter / Walk-in</Badge>;
  if (status === "verified")
    return <Badge className="bg-green-100 text-green-800 border-green-200 border">Verified</Badge>;
  if (status === "rejected")
    return <Badge className="bg-red-100 text-red-800 border-red-200 border">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 border">Pending Review</Badge>;
}

export function Payments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const { data: allOrders, isLoading } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), refetchInterval: 5000 } }
  );

  const verifyPayment = useVerifyOrderPayment();

  const [selectedOrder, setSelectedOrder] = useState<NonNullable<typeof allOrders>[0] | null>(null);
  const [action, setAction] = useState<VerifyAction>("approve");
  const [adminNote, setAdminNote] = useState("");
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  const orders = (allOrders || []).filter((o) => {
    const method = (o as any).paymentMethod as string | undefined;
    if (activeTab === "all") return true;
    if (activeTab === "counter") return method === "counter" || o.paymentStatus === "counter";
    if (activeTab === "pending") return o.paymentStatus === "pending" && method !== "counter";
    return o.paymentStatus === activeTab;
  });

  const pendingCount = (allOrders || []).filter(
    (o) => o.paymentStatus === "pending" && (o as any).paymentMethod !== "counter"
  ).length;
  const counterCount = (allOrders || []).filter(
    (o) => (o as any).paymentMethod === "counter" || o.paymentStatus === "counter"
  ).length;

  function openAction(order: NonNullable<typeof allOrders>[0], act: VerifyAction) {
    setSelectedOrder(order);
    setAction(act);
    setAdminNote("");
  }

  function closeDialog() {
    setSelectedOrder(null);
    setAdminNote("");
  }

  function handleConfirm() {
    if (!selectedOrder) return;
    verifyPayment.mutate(
      {
        id: selectedOrder.id,
        data: { action, adminNote: adminNote || undefined },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({}) });
          toast({
            title: action === "approve" ? "Payment Approved" : "Payment Rejected",
            description: `Order ${selectedOrder.orderNumber} payment has been ${action === "approve" ? "verified" : "rejected"}.`,
          });
          closeDialog();
        },
        onError: () => {
          toast({ title: "Action failed", description: "Could not update payment status.", variant: "destructive" });
        },
      }
    );
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "pending", label: "Online — Pending", count: pendingCount },
    { key: "counter", label: "Counter / Walk-in", count: counterCount },
    { key: "verified", label: "Verified" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Payment Verification</h1>
        <p className="text-muted-foreground">Review GCash/Maya receipts and track walk-in counter payments.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Online Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Banknote className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{counterCount}</div>
              <div className="text-xs text-muted-foreground">Counter / Walk-in</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {(allOrders || []).filter(o => o.paymentStatus === "verified").length}
              </div>
              <div className="text-xs text-muted-foreground">Verified</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {(allOrders || []).filter(o => o.paymentStatus === "rejected").length}
              </div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-white text-xs font-bold rounded-full px-1.5 py-0 leading-5 ${
                t.key === "counter" ? "bg-blue-500" : "bg-amber-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Counter payment info banner */}
      {activeTab === "counter" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3 text-sm">
          <Banknote className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Walk-in / Counter Payment Orders</p>
            <p className="text-blue-700">These customers will pay in cash at the counter when they pick up their order. No receipt verification needed — just collect payment and mark as done.</p>
          </div>
        </div>
      )}

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading payments…</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <CreditCard className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              {activeTab === "pending"
                ? "No online payments awaiting review."
                : activeTab === "counter"
                ? "No counter payment orders."
                : "No orders found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isCounter = (order as any).paymentMethod === "counter" || order.paymentStatus === "counter";
            const totalAmt = (order as any).totalAmount as number | undefined;
            return (
              <Card
                key={order.id}
                className={`border-l-4 ${
                  isCounter
                    ? "border-l-blue-500"
                    : order.paymentStatus === "verified"
                    ? "border-l-green-500"
                    : order.paymentStatus === "rejected"
                    ? "border-l-red-500"
                    : "border-l-amber-500"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Receipt thumbnail / counter icon */}
                    <div
                      className={`flex-shrink-0 w-full sm:w-28 h-28 rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden ${
                        !isCounter && order.paymentReceiptUrl ? "cursor-pointer hover:bg-muted/60 transition-colors" : ""
                      }`}
                      onClick={() => !isCounter && order.paymentReceiptUrl && setReceiptPreviewUrl(order.paymentReceiptUrl)}
                    >
                      {isCounter ? (
                        <div className="flex flex-col items-center gap-1 text-blue-400">
                          <Banknote className="w-10 h-10" />
                          <span className="text-[10px] font-medium text-blue-600">Counter</span>
                        </div>
                      ) : order.paymentReceiptUrl ? (
                        <div className="relative w-full h-full">
                          <img
                            src={order.paymentReceiptUrl}
                            alt="Receipt"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                          <FileText className="w-8 h-8" />
                          <span className="text-[10px]">No receipt</span>
                        </div>
                      )}
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-bold text-sm">{order.orderNumber}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format(new Date(order.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <PaymentStatusBadge
                          status={order.paymentStatus}
                          method={(order as any).paymentMethod}
                        />
                      </div>

                      <div className="text-sm">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-muted-foreground ml-2">{order.email}</span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs block">Payment</span>
                          <span className="flex items-center gap-1 font-medium">
                            {isCounter ? (
                              <><Banknote className="w-3.5 h-3.5 text-blue-500" /> Counter / Cash</>
                            ) : (
                              <><Smartphone className="w-3.5 h-3.5 text-primary" /> GCash / Maya</>
                            )}
                          </span>
                        </div>
                        {!isCounter && (
                          <div>
                            <span className="text-muted-foreground text-xs block">Reference #</span>
                            <span className={`font-mono font-medium ${order.paymentReference ? "" : "text-muted-foreground/40 italic"}`}>
                              {order.paymentReference || "Not provided"}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground text-xs block">Service</span>
                          <span className="capitalize">{order.serviceType.replace("-", " ")}</span>
                        </div>
                        {totalAmt && totalAmt > 0 ? (
                          <div>
                            <span className="text-muted-foreground text-xs block">Amount</span>
                            <span className="font-bold text-primary">₱{totalAmt}</span>
                          </div>
                        ) : null}
                        <div>
                          <span className="text-muted-foreground text-xs block">Pickup</span>
                          <span>{order.pickupTime ? format(new Date(order.pickupTime), "MMM d · h:mm a") : "Not scheduled"}</span>
                        </div>
                      </div>

                      {order.paymentAdminNote && (
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 border-l-2 border-muted-foreground/30">
                          Admin note: {order.paymentAdminNote}
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isCounter && order.paymentStatus === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => openAction(order, "approve")}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => openAction(order, "reject")}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Request Clarification
                          </Button>
                        </div>
                      )}
                      {!isCounter && order.paymentStatus !== "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => openAction(order, order.paymentStatus === "verified" ? "reject" : "approve")}
                          >
                            Change Status
                          </Button>
                        </div>
                      )}
                      {isCounter && (
                        <div className="pt-1">
                          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                            Customer will pay ₱{totalAmt || "—"} in cash at the counter on pickup.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt preview dialog */}
      <Dialog open={!!receiptPreviewUrl} onOpenChange={(v) => !v && setReceiptPreviewUrl(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Payment Receipt
            </DialogTitle>
          </DialogHeader>
          {receiptPreviewUrl && (
            <div className="bg-muted/30 flex items-center justify-center p-2">
              <img src={receiptPreviewUrl} alt="Receipt" className="max-h-[70vh] w-full object-contain rounded" />
            </div>
          )}
          <div className="px-4 pb-4 pt-2">
            <Button variant="outline" size="sm" className="w-full" onClick={() => setReceiptPreviewUrl(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "approve" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              {action === "approve" ? "Approve Payment" : "Request Clarification"}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/30 border p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Order:</span> <strong>{selectedOrder.orderNumber}</strong></div>
                <div><span className="text-muted-foreground">Customer:</span> {selectedOrder.customerName}</div>
                <div><span className="text-muted-foreground">Ref #:</span> <span className="font-mono">{selectedOrder.paymentReference || "—"}</span></div>
                {(selectedOrder as any).totalAmount > 0 && (
                  <div><span className="text-muted-foreground">Amount:</span> <strong className="text-primary">₱{(selectedOrder as any).totalAmount}</strong></div>
                )}
              </div>

              {action === "approve" ? (
                <p className="text-sm text-muted-foreground">
                  Approving this payment will allow the order to enter the active print queue.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The customer will be notified that their payment needs clarification.
                </p>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Admin note (optional)</label>
                <Textarea
                  placeholder={action === "approve" ? "Any remarks…" : "Reason for rejection or what the customer needs to resubmit…"}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={verifyPayment.isPending}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {verifyPayment.isPending ? "Processing…" : action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
