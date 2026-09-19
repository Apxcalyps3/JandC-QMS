import { useGetOrderAnalytics, getGetOrderAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Timer, CheckCircle2, TrendingUp, BarChart3, Calendar } from "lucide-react";

function formatMinutes(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function Analytics() {
  const { data, isLoading } = useGetOrderAnalytics({
    query: {
      queryKey: getGetOrderAnalyticsQueryKey(),
      refetchInterval: 10000,
    },
  });

  const maxHourlyCount = data?.hourlyBreakdown
    ? Math.max(...data.hourlyBreakdown.map((h) => h.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Live performance metrics and timing data</p>
      </div>

      {/* Timing Metrics */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Average Timing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover-elevate border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wait Time</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "—" : formatMinutes(data?.avgWaitMinutes ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Order placed → processing started
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
              <Timer className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "—" : formatMinutes(data?.avgProcessingMinutes ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Processing started → completed
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Turnaround</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "—" : formatMinutes(data?.avgTotalMinutes ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Order placed → completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Throughput */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Throughput</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "—" : data?.todayTotal ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total received today</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "—" : data?.todayCompleted ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Finished today</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "—" : `${data?.completionRate ?? 0}%`}</div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${data?.completionRate ?? 0}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All-Time Orders</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "—" : data?.totalAllTime ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.completedAllTime ?? 0} completed all-time
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Today's Hourly Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Orders by Hour (Today)
            </CardTitle>
            <CardDescription>
              {data?.peakHour !== null && data?.peakHour !== undefined
                ? `Peak hour: ${formatHour(data.peakHour)}`
                : "No orders placed yet today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : !data?.hourlyBreakdown?.length ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet for today</div>
            ) : (
              <div className="space-y-2">
                {data.hourlyBreakdown.map((h) => (
                  <div key={h.hour} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12 text-right">{formatHour(h.hour)}</span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/80 rounded transition-all flex items-center pl-2"
                        style={{ width: `${(h.count / maxHourlyCount) * 100}%` }}
                      >
                        <span className="text-xs text-primary-foreground font-medium">{h.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timing guidance note */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              How Timing Is Measured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">Wait Time</div>
                Time from when a customer places an order until an admin clicks "Process". Reflects queue congestion.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">Processing Time</div>
                Time between "Process" and "Complete" clicks. Reflects how long the actual print job takes.
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-foreground">Total Turnaround</div>
                End-to-end time from order placed to completed. The number customers experience.
              </div>
            </div>
            <p className="text-xs border-t pt-3">
              Timing averages are computed from orders that have been fully processed. New data appears as orders are completed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
