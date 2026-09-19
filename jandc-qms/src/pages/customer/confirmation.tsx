import { Link, useSearch } from "wouter";
import { CheckCircle2, Copy, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function Confirmation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderNumber = params.get("orderNumber");
  const waitTime = params.get("wait") || "10";
  const paymentMethod = params.get("method") === "counter" ? "counter" : "online";
  const { toast } = useToast();

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
        <p className="mt-2"><Link href="/" className="text-primary hover:underline">Return home</Link></p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-8">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Order Received!</h1>
        <p className="text-muted-foreground text-lg">
          Your order has been placed in the queue.
        </p>
      </div>

      <Card className="bg-secondary text-secondary-foreground border-none">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wider font-semibold opacity-80">Your Order Number</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl md:text-5xl font-black text-primary tracking-widest">{orderNumber}</span>
              <Button variant="ghost" size="icon" onClick={copyToClipboard} className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-primary">
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="bg-card text-card-foreground rounded-lg p-4 max-w-sm mx-auto shadow-inner">
            <p className="text-sm text-muted-foreground">Estimated wait time</p>
            <p className="text-2xl font-bold text-orange-500">~{waitTime} minutes</p>
          </div>

           <p className="text-sm opacity-90 max-w-md mx-auto">
             Please keep this number to track your order.{" "}
             {paymentMethod === "online"
               ? "You can return to the tracking page for live updates."
               : "Return to the tracking page anytime to check its status."}
           </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button asChild variant="outline" size="lg">
          <Link href={`/track?orderNumber=${orderNumber}`}>
            <Search className="w-4 h-4 mr-2" /> Track Status
          </Link>
        </Button>
        <Button asChild size="lg">
          <Link href="/">
            Order Another <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
