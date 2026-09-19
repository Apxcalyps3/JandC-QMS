import { Link } from "wouter";
import { Printer, ArrowRight, Search, Upload, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="grid gap-8 rounded-2xl border bg-card p-6 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:items-center md:p-10">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Printer className="h-3.5 w-3.5" />
            Simple printing, clear status
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-secondary md:text-5xl">
              Send your files. Pick them up when they’re ready.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Upload your documents, choose print settings, select payment, and receive a ticket for pickup.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="font-semibold">
              <Link href="/order/printing">
                Start a print order <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/track">
                <Search className="mr-2 h-4 w-4" /> Track an order
              </Link>
            </Button>
          </div>
        </div>
        <div className="rounded-xl border bg-muted/35 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you can do here</p>
          <div className="mt-4 space-y-4">
            {[
              { icon: Upload, label: "Upload print-ready files" },
              { icon: SlidersHorizontal, label: "Choose size, color, and copies" },
              { icon: CheckCircle2, label: "Track the queue until pickup" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm font-medium">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Order steps">
        {[
          { number: "1", title: "Upload", description: "Add the files you want printed." },
          { number: "2", title: "Configure", description: "Set paper, color, and copies." },
          { number: "3", title: "Collect", description: "Use your ticket to track pickup." },
        ].map((step) => (
          <Card key={step.number} className="border bg-card shadow-none">
            <CardContent className="flex gap-3 p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                {step.number}
              </span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{step.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
