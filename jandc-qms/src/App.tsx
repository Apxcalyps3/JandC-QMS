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
              <Route path="/admin" component={Dashboard} />
              <Route path="/admin/orders" component={Orders} />
              <Route path="/admin/queue" component={Queue} />
              <Route path="/admin/analytics" component={Analytics} />
              <Route path="/admin/payments" component={Payments} />
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
