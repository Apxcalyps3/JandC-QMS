import { Link, useSearch } from "wouter";
import { CheckCircle2, Copy, Search, ArrowRight, Users, Clock, BellRing, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTrackOrder, getTrackOrderQueryKey } from "@workspace/api-client-react";

export function Confirmation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderNumber = params.get("orderNumber");
  const fallbackWaitTime = params.get("wait") || "10";
  const orderMode = params.get("mode") || "walk-in";
  const { toast } = useToast();

  const { data: order } = useTrackOrder(orderNumber || "", {
    query: {
      enabled: !!orderNumber,
      queryKey: getTrackOrderQueryKey(orderNumber || ""),
      refetchInterval: 4000,
    },
  });

  const copyToClipboard = () => {
    if (orderNumber) {
      navigator.clipboard.writeText(orderNumber);
      toast({
        title: "Copied!",
        description: "Order number copied to clipboard.",
      });
    }
  };

  if (!orderNumber) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-destructive">Invalid Order</h1>
        <p className="mt-2">
          <Link href="/" className="text-primary hover:underline">
            Return home
          </Link>
        </p>
      </div>
    );
  }

  const queuePosition = order?.queuePosition ?? 1;
  const estimatedWait = order?.estimatedMinutes ?? fallbackWaitTime;

  return (
    <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>
      </div>

      <div className="space-y-1">
        <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider mb-2">
          Order Placed & Queued
        </Badge>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Order Placed Successfully!</h1>
        <p className="text-muted-foreground text-sm">
          Your print order has been received and verified by our system.
        </p>
      </div>

      {/* Ticket Card */}
      <Card className="border-2 border-primary/20 bg-card overflow-hidden shadow-sm">
        <div className="bg-primary/5 px-6 py-4 border-b flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Official Queue Ticket
          </span>
          <Badge className="bg-emerald-600 text-white font-medium text-xs">
            {order?.status === "completed" ? "Ready for Pickup" : "In Line"}
          </Badge>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Your Order Ticket Number
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl md:text-5xl font-black text-primary tracking-widest font-mono">
                {orderNumber}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="text-muted-foreground hover:text-primary hover:bg-muted"
                title="Copy order number"
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Prompt 5.1: Waiting Line & Waiting Time */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            <div className="bg-muted/40 rounded-xl p-4 border text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs font-semibold">
                <Users className="w-4 h-4 text-primary" /> Waiting Line
              </div>
              <p className="text-2xl sm:text-3xl font-black text-foreground">
                #{queuePosition}
              </p>
              <p className="text-[11px] text-muted-foreground">In queue sequence</p>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 border text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs font-semibold">
                <Clock className="w-4 h-4 text-amber-500" /> Waiting Time
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600">
                ~{estimatedWait}m
              </p>
              <p className="text-[11px] text-muted-foreground">Estimated duration</p>
            </div>
          </div>

          {/* Notification Callout */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-left flex items-start gap-3">
            <BellRing className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">Live Pickup Notification</p>
              <p className="text-muted-foreground leading-relaxed">
                You will be notified on the tracking screen as soon as your document printing is completed and ready for pickup at the counter.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button asChild size="lg" className="font-bold">
          <Link href={`/track?orderNumber=${orderNumber}`}>
            <Search className="w-4 h-4 mr-2" /> Open Live Order Tracking
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">
            Order Another Print <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
