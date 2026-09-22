import { useListEarnings, getListEarningsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { format } from "date-fns";
import { useCurrency } from "@/lib/currency";
import { useCurrentUser } from "@/lib/current-user";

export function EarningsPage() {
  const { format: formatCoins } = useCurrency();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const userId = user?.id;
  const bannedUser = user as (typeof user & { bannedAt?: string | null; banReason?: string | null }) | undefined;
  const isBanned = Boolean(bannedUser?.bannedAt);

  const { data: earnings, isLoading: isEarningsLoading } = useListEarnings(
    { userId },
    { query: { enabled: !!userId, queryKey: getListEarningsQueryKey({ userId }) } }
  );

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Coins</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your balance and reward history.</p>
      </div>

      {isBanned && (
        <section role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
          <p className="font-medium">Rewards unavailable</p>
          <p className="mt-1 text-red-100/80">
            Your account is restricted.
            {bannedUser?.banReason ? ` Reason: ${bannedUser.banReason}` : ""}
          </p>
        </section>
      )}

      <section className="space-y-5">
        <div>
          {isUserLoading ? (
            <Skeleton className="h-10 w-36" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              {formatCoins(user?.balance || 0)}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Lifetime: {isUserLoading ? "—" : formatCoins(user?.totalEarnings || 0)}
          </p>
        </div>
      </section>

      <section className="space-y-3 border-t border-border/60 pt-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Reward history</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Recent coins earned from playing.</p>
        </div>

        <div className="divide-y divide-border/60">
          {isEarningsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : earnings?.length ? (
            earnings
              .filter((earning) => earning.type !== "withdrawal")
              .map((earning) => (
                <div key={earning.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Reward</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(earning.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-emerald-400">
                      +{formatCoins(earning.amount)}
                    </p>
                    <p className="text-[11px] capitalize text-muted-foreground">{earning.status}</p>
                  </div>
                </div>
              ))
          ) : (
            <EmptyState
              title="No rewards yet"
              message="Play games to start earning coins."
            />
          )}
        </div>
      </section>
    </div>
  );
}
