import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home,
  Activity,
  CalendarClock,
  History,
  Settings,
  Menu,
  Clock,
  LogOut,
  ArrowLeft,
  Volume2,
  VolumeX,
  Power
} from "lucide-react";
import { JNConnectLogo } from "@/components/ui/jnconnect-logo";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/lib/admin-auth";
import { ADMIN_NAV_ITEMS } from "@/lib/workflow-rules";
import { useAdminSettings } from "@/lib/admin-settings-state";
import { playOrderAlertChime } from "@/lib/printer-hardware-state";

const navIcons: Record<string, any> = {
  home: Home,
  liveQueue: Activity,
  scheduled: CalendarClock,
  history: History,
  settings: Settings,
};

const navItems = ADMIN_NAV_ITEMS.map((item) => ({
  ...item,
  icon: navIcons[item.icon] || Home,
}));

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { logout } = useAdminAuth();
  const { settings, updateSettings } = useAdminSettings();
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
        if (settings.audioAlertsEnabled) {
          playOrderAlertChime();
        }
        toast({
          title: "New Incoming Order",
          description: "New paid order requires admin Pre-Flight Go Signal.",
        });
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Print Order Received", { 
            body: "New order received at counter. Awaiting Pre-Flight verification." 
          });
        } else if ("Notification" in window && Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
      setLastOrderCount(orders.length);
    }
  }, [orders, lastOrderCount, toast, settings.audioAlertsEnabled]);

  const pendingCount = orders?.filter(o => o.status === "pending").length || 0;
  const forPickupCount = orders?.filter(o => (o as any).status === "for_pickup" || (o as any).status === "ready").length || 0;

  const toggleSystemState = () => {
    const nextState = settings.systemState === "ONLINE" ? "OFFLINE" : "ONLINE";
    updateSettings({ systemState: nextState });
    toast({
      title: nextState === "ONLINE" ? "System ONLINE" : "System OFFLINE / CLOSED",
      description: nextState === "ONLINE"
        ? "Now accepting new online walk-in and scheduled orders."
        : "Online queue paused for closing routine batch processing (SOP 8.2).",
      variant: nextState === "ONLINE" ? "default" : "destructive",
    });
  };

  const toggleAudio = () => {
    updateSettings({ audioAlertsEnabled: !settings.audioAlertsEnabled });
    if (!settings.audioAlertsEnabled) {
      playOrderAlertChime();
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Shop Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-3 hover:text-primary transition-colors">
          <div className="bg-white p-1 px-1.5 rounded-md shadow-sm flex items-center justify-center border">
            <JNConnectLogo className="h-7 w-auto" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-sm text-sidebar-foreground leading-tight truncate">JANDC QMS</span>
            <span className="text-[10px] text-muted-foreground font-medium">SOP-QMS-2026-001</span>
          </div>
        </Link>
        <div className="mt-3 flex items-center justify-between text-xs px-1">
          <span className="text-[11px] text-muted-foreground font-medium truncate">{settings.adminName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-primary/5 text-primary border-primary/20">
            {settings.adminRole}
          </Badge>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1.5">
          Operational Panels (SOP 5.1)
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive 
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.href === "/admin/live-queue" && pendingCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] rounded-full">
                  {pendingCount}
                </Badge>
              )}
              {item.href === "/admin" && forPickupCount > 0 && (
                <Badge className="h-5 px-1.5 text-[10px] rounded-full bg-emerald-600 text-white">
                  {forPickupCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions & System State */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="p-2.5 rounded-lg border bg-card/60 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">QMS State</span>
            <span className={`text-xs font-black ${settings.systemState === "ONLINE" ? "text-emerald-600" : "text-amber-600"}`}>
              {settings.systemState === "ONLINE" ? "ONLINE / OPEN" : "OFFLINE / CLOSED"}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleSystemState}
            className="h-7 text-xs px-2 gap-1"
            title="Toggle system state (SOP 8.2 Closing Routine)"
          >
            <Power className="w-3 h-3" /> Toggle
          </Button>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-xs w-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Customer Portal
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors text-xs w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
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
            <div className="flex items-center gap-2">
              <div className="bg-white p-0.5 px-1 rounded shadow-sm flex items-center justify-center border">
                <JNConnectLogo className="h-5 w-auto" />
              </div>
              <span className="font-semibold text-sm">JANDC QMS</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs font-bold px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${
                settings.systemState === "ONLINE" 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" 
                  : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
              }`}
              onClick={toggleSystemState}
              title="Click to toggle system state (SOP 8.2)"
            >
              <span className={`h-2 w-2 rounded-full ${settings.systemState === "ONLINE" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {settings.systemState === "ONLINE" ? "ONLINE / OPEN" : "OFFLINE / CLOSED"}
            </Badge>

            <span className="hidden sm:inline-block text-xs text-muted-foreground">
              JANDC Internet Cafe & Services
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio chime alert toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAudio}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title={settings.audioAlertsEnabled ? "Audio chimes active (Click to mute)" : "Audio chimes muted (Click to enable)"}
            >
              {settings.audioAlertsEnabled ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>

            <div
              className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex"
              aria-live="polite"
              title="Operational telemetry refreshes automatically every 5 seconds"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Telemetry · 5s
            </div>

            <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex gap-2 text-muted-foreground hover:text-foreground">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
                Customer View
              </Link>
            </Button>

            <Link
              href="/admin/live-queue"
              aria-label={`${pendingCount} pending queue orders`}
              className="relative inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">Queue</span>
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

