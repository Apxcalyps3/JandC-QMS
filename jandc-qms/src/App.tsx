import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { OrderProvider } from "@/components/order-provider";
import { AdminAuthProvider } from "@/lib/admin-auth";
import { AdminGuard } from "@/components/admin-guard";

// Layouts
import { CustomerLayout } from "@/components/layout/customer-layout";
import { AdminLayout } from "@/components/layout/admin-layout";

// Customer Pages
import { Home } from "@/pages/customer/home";
import { PrintingForm } from "@/pages/customer/printing-form";
import { ReviewOrder } from "@/pages/customer/review-order";
import { Confirmation } from "@/pages/customer/confirmation";
import { TrackOrder } from "@/pages/customer/track-order";

// Admin Pages
import { AdminLogin } from "@/pages/admin/login";
import { Dashboard } from "@/pages/admin/dashboard";
import { LiveQueue } from "@/pages/admin/live-queue";
import { ScheduledTelemetry } from "@/pages/admin/scheduled";
import { HistoryPanel } from "@/pages/admin/history";
import { SettingsPanel } from "@/pages/admin/settings";
import { Orders } from "@/pages/admin/orders";
import { Queue } from "@/pages/admin/queue";
import { Analytics } from "@/pages/admin/analytics";
import { Payments } from "@/pages/admin/payments";

const queryClient = new QueryClient();

function CustomerRoutes() {
  return (
    <CustomerLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/order/printing" component={PrintingForm} />
        <Route path="/order/review" component={ReviewOrder} />
        <Route path="/order/confirmation" component={Confirmation} />
        <Route path="/track" component={TrackOrder} />
        <Route component={NotFound} />
      </Switch>
    </CustomerLayout>
  );
}

function AdminRoutes() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route>
        <AdminGuard>
          <AdminLayout>
            <Switch>
              {/* 5 SOP Core Admin Panels (SOP-QMS-2026-001 Section 5.1) */}
              <Route path="/admin" component={Dashboard} />
              <Route path="/admin/live-queue" component={LiveQueue} />
              <Route path="/admin/scheduled" component={ScheduledTelemetry} />
              <Route path="/admin/history" component={HistoryPanel} />
              <Route path="/admin/settings" component={SettingsPanel} />

              {/* Backwards-compatible route aliases */}
              <Route path="/admin/queue" component={LiveQueue} />
              <Route path="/admin/orders" component={HistoryPanel} />
              <Route path="/admin/analytics" component={HistoryPanel} />
              <Route path="/admin/payments" component={HistoryPanel} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </AdminGuard>
      </Route>
    </Switch>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin/*" component={AdminRoutes} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/*" component={CustomerRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <OrderProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </OrderProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
