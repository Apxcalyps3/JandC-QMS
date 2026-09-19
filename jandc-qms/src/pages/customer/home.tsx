import { Link } from "wouter";
import { ArrowRight, Search, Users, Calendar, Clock, Sparkles, CheckCircle2, ShieldAlert } from "lucide-react";
import { JNConnectLogo } from "@/components/ui/jnconnect-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrder } from "@/components/order-provider";
import { useGetQueueEstimate, getGetQueueEstimateQueryKey } from "@workspace/api-client-react";

export function Home() {
  const { updateState } = useOrder();
  const estimateParams = { printColor: "bw", pageCount: 1, copies: 1 };
  const { data: queueEstimate } = useGetQueueEstimate(estimateParams, {
    query: { queryKey: getGetQueueEstimateQueryKey(estimateParams), refetchInterval: 10000 },
  });

  const queueOrders = queueEstimate?.ordersAhead ?? 0;
  const waitMinutes = queueEstimate?.estimatedWaitMinutes ?? 5;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
            <JNConnectLogo className="h-4 w-auto" />
            JNConnect · A QMS for JandC Internet Cafe and Services
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary md:text-5xl">
            Choose Your Order Type
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Select whether you are at the shop for a fast <strong>Walk-in Order</strong> or planning ahead with a <strong>Scheduled Order</strong>.
          </p>
        </div>

        {/* The Two Main Paths */}
        <div className="grid gap-6 mt-8 md:grid-cols-2">
          {/* Path 1: Walk-In */}
          <div className="relative rounded-xl border-2 border-primary/20 bg-card p-6 shadow-sm hover:border-primary/60 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-semibold">
                  Quick Print
                </Badge>
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Users className="w-3.5 h-3.5" />
                  {queueOrders === 0 ? "No wait in queue" : `${queueOrders} in queue (~${waitMinutes}m)`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Walk-in Order</h2>
                  <p className="text-xs text-muted-foreground">For customers currently at or arriving at the shop</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Tracked exclusively by your Order Number—no names, emails, or mobile numbers required. Live walk-in queue, file submission bin (.pdf, .docx, .xlsx, .pptx, images), PDF page preview, and GCash payment with receipt verification.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                asChild
                size="lg"
                className="w-full font-semibold"
                onClick={() => updateState({ orderMode: "walk-in" })}
              >
                <Link href="/order/printing?mode=walk-in">
                  Proceed as Walk-in <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Path 2: Scheduled */}
          <div className="relative rounded-xl border-2 border-muted-foreground/20 bg-card p-6 shadow-sm hover:border-secondary transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-secondary/30 bg-secondary/10 text-secondary font-semibold">
                  Advanced Booking
                </Badge>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Calendar className="w-3.5 h-3.5" /> Pick your own date & time
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Scheduled Order</h2>
                  <p className="text-xs text-muted-foreground">Set your pickup date and time in advance</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Prompted to set your preferred pickup date & operating time first, then submit files, check PDF preview, pay via GCash with receipt verification, and pick up on your scheduled date.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="w-full font-semibold"
                onClick={() => updateState({ orderMode: "scheduled" })}
              >
                <Link href="/order/printing?mode=scheduled">
                  Proceed as Scheduled <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Order Track */}
        <div className="mt-6 flex justify-center">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link href="/track">
              <Search className="mr-2 h-4 w-4" /> Already have a ticket? Track an existing order
            </Link>
          </Button>
        </div>
      </section>

      {/* Overview of the 5-Step Customer Workflow */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            num: "1 & 2",
            title: "Select & Submit",
            desc: "Pick walk-in (live queue) or scheduled (pickup date/time), then submit files in the dropzone.",
          },
          {
            num: "3",
            title: "Preview & Specs",
            desc: "Inspect PDF preview, page count, specs, pricing, elapsed time, and edit files in-system.",
          },
          {
            num: "4",
            title: "GCash QR & Receipt",
            desc: "Scan the GCash QR, submit receipt screenshot, and ensure receipt amount matches calculated cost.",
          },
          {
            num: "5",
            title: "Line & Pickup Notice",
            desc: "Receive ticket with queue position & wait time, then get notified when ready for pickup.",
          },
        ].map((item) => (
          <Card key={item.num} className="border bg-card shadow-none">
            <CardContent className="p-4 space-y-1.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Step {item.num}
              </span>
              <p className="font-semibold text-sm pt-1">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
