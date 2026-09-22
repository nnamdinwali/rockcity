import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2, Users, Coins, Activity, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), retry: 1, refetchOnWindowFocus: false }
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl w-full" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-card/50 p-8 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Dashboard temporarily unavailable</h1>
          <p className="text-muted-foreground">Your session is still being synchronized. Try again and the dashboard will reload without leaving the page.</p>
          <button type="button" onClick={() => void refetch()} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90">Retry dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold font-heading uppercase tracking-tighter text-glow-primary flex items-center gap-3">
          <Activity className="w-8 h-8" /> Platform Stats
        </h1>
        <p className="text-muted-foreground">Global metrics and real-time activity across Rockcity Games.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card/50 border-primary/20 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-primary" /> Total Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold">{formatNumber(stats.totalGames)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-secondary/20 hover:border-secondary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-secondary" /> Registered Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold">{formatNumber(stats.totalPlayers)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-accent/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-accent" /> Total Coins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold text-accent text-glow-accent">{formatNumber(stats.totalPayouts)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-success/20 hover:border-success/50 transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-16 h-16 text-success animate-pulse" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" /> Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold text-success flex items-baseline gap-2">
              {formatNumber(stats.activeSessionsCount)}
              <span className="text-xs uppercase font-sans tracking-wider text-success/70 font-bold">Live</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Genre Distribution */}
      <Card className="bg-card/80 backdrop-blur border-border overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl flex items-center gap-2 font-heading uppercase tracking-tight">
            <TrendingUp className="w-5 h-5 text-primary" /> Popular Genres
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {stats.topGenres.map((item, index) => {
              // Calculate percentage relative to the top genre for the bar width
              const maxCount = stats.topGenres[0]?.count || 1;
              const percentage = (item.count / maxCount) * 100;
              
              return (
                <div key={item.genre} className="p-6 flex items-center gap-6 group hover:bg-muted/30 transition-colors">
                  <div className="w-8 font-mono font-bold text-muted-foreground text-right">
                    #{index + 1}
                  </div>
                  <div className="w-32 font-bold uppercase tracking-wide">
                    {item.genre}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                          index === 0 ? 'bg-primary' : 
                          index === 1 ? 'bg-accent' : 
                          index === 2 ? 'bg-secondary' : 'bg-muted-foreground'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right font-mono font-bold">
                    {formatNumber(item.count)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
