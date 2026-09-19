import { useState } from "react";
import { useSearch } from "wouter";
import { Search, Package, CheckCircle2, Clock, Printer, FileText, RefreshCw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTrackOrder, getTrackOrderQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { normalizeEstimatedWaitMinutes } from "@/lib/workflow-rules";

export function TrackOrder() {
  const searchParams = new URLSearchParams(useSearch());
  const initialOrderNumber = searchParams.get("orderNumber") || "";
  
  const [searchInput, setSearchInput] = useState(initialOrderNumber);
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);

  const { data: order, isLoading, error, isError } = useTrackOrder(orderNumber, {
    query: {
      enabled: !!orderNumber,
      queryKey: getTrackOrderQueryKey(orderNumber),
      refetchInterval: 5000, // Poll every 5s for live updates
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setOrderNumber(searchInput.trim());
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-amber-800 bg-amber-100 border-amber-200";
      case "processing": return "text-blue-800 bg-blue-100 border-blue-200";
      case "completed": return "text-green-800 bg-green-100 border-green-200";
      case "cancelled": return "text-red-800 bg-red-100 border-red-200";
      default: return "text-gray-700 bg-gray-100 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-8 h-8 text-yellow-600" />;
      case "processing": return <Printer className="w-8 h-8 text-blue-600" />;
      case "completed": return <CheckCircle2 className="w-8 h-8 text-green-600" />;
      default: return <Package className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Search className="h-4 w-4" /> Order lookup
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Track your order</h1>
        <p className="text-muted-foreground">Use the order number from your ticket to see the latest status.</p>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-5 md:p-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="order-number" className="text-sm font-medium">Order number</label>
            <Input 
              id="order-number"
              placeholder="e.g. JNC-12345" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-11 text-base"
            />
            </div>
            <Button type="submit" size="lg" className="py-6 px-8">
              <Search className="w-5 h-5 mr-2" /> Find order
            </Button>
          </form>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Status refreshes automatically while this page is open.
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Searching for order...</p>
        </div>
      )}

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-5 text-destructive">
            <Package className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-semibold">Order not found</h3>
              <p className="mt-1 text-sm">Check the order number and try again.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {order && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/25 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order ticket</p>
                  <CardTitle className="mt-1 text-2xl">{order.orderNumber}</CardTitle>
                </div>
                <span
                  aria-live="polite"
                  className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold capitalize ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 py-5 md:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-xl border bg-muted/25 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm">
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <h4 className="font-bold capitalize">{order.status}</h4>
                      <p className="text-sm text-muted-foreground">
                        {order.status === "pending" && "Your order is waiting in the queue."}
                        {order.status === "processing" && "Your order is being printed now."}
                        {order.status === "completed" && "Your order is ready for pickup."}
                        {order.status === "cancelled" && "This order was cancelled."}
                      </p>
                    </div>
                  </div>
                  {order.status === "pending" && (
                    <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Queue position</div>
                        <div className="mt-1 text-3xl font-black text-primary">#{order.queuePosition}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Est. wait</div>
                        <div className="mt-1 text-3xl font-black text-primary">~{normalizeEstimatedWaitMinutes(order.estimatedMinutes)}m</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order details</h4>
                    <ul className="mt-3 space-y-3 text-sm">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{order.serviceType === "printing" ? "Document Printing" : "ID Picture"}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Date ordered:</span>
                        <span className="font-medium">{format(new Date(order.createdAt), "MMM d, h:mm a")}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Customer:</span>
                        <span className="font-medium">{order.customerName}</span>
                      </li>
                    </ul>
                  </div>

                   <div>
                     <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Files ({order.fileCount})</h4>
                     <div className="mt-3 space-y-2">
                      {order.files?.map((f, i) => (
                         <div key={i} className="flex items-center gap-2 rounded border bg-card p-2 text-sm">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="truncate flex-1">{f.originalName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                   {order.pickupTime && (
                     <div className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                       <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                       <div>
                         <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup time</p>
                         <p className="mt-1 font-medium">{format(new Date(order.pickupTime), "EEEE, MMM d · h:mm a")}</p>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
