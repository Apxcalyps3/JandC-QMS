import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ListOrdered, 
  Printer, 
  Menu,
  Clock,
  BarChart3,
  LogOut,
  ArrowLeft,
  CreditCard
} from "lucide-react";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/admin-auth";
import { ADMIN_NAV_ITEMS } from "@/lib/workflow-rules";

const navIcons = {
  dashboard: LayoutDashboard,
  orders: ListOrdered,
  queue: Clock,
  payments: CreditCard,
  analytics: BarChart3,
};
const navItems = ADMIN_NAV_ITEMS.map((item) => ({
  ...item,
  icon: navIcons[item.icon],
}));

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { logout } = useAdminAuth();
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);

  const { data: orders } = useListOrders(
    {}, 
    { 
      query: { 
        queryKey: getListOrdersQueryKey({}),
        refetchInterval: 5000 
      } 
    }
  );

  useEffect(() => {
    if (orders) {
      if (lastOrderCount !== null && orders.length > lastOrderCount) {
        toast({
          title: "New Order",
          description: "A new order has been placed in the queue.",
        });
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Order", { body: "A new order has been placed in the queue." });
        } else if ("Notification" in window && Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
      setLastOrderCount(orders.length);
    }
  }, [orders, lastOrderCount, toast]);

  const pendingCount = orders?.filter(o => o.status === "pending").length || 0;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-xl text-sidebar-foreground hover:text-primary transition-colors">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Printer className="w-5 h-5" />
          </div>
          JandC Admin
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Customer Portal
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors text-sm w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b h-16 flex items-center px-4 md:px-6 justify-between sticky top-0 z-10">
          <div className="flex items-center md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-sidebar-border">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="font-semibold">JandC Admin</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div
              className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"
              aria-live="polite"
              title="Operational data refreshes automatically every five seconds"
            >
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Live · refreshes every 5s
            </div>
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex gap-2 text-muted-foreground hover:text-foreground">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Customer Portal
              </Link>
            </Button>
            <Link
              href="/admin/queue"
              aria-label={`${pendingCount} pending orders`}
              className="relative inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Pending</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="min-w-[20px] justify-center rounded-full px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
