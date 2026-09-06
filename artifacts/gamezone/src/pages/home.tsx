import { Link } from "wouter";
import { useEffect, useState } from "react";
import { ChevronRight, Gift, Search, Ticket, Trophy } from "lucide-react";
import {
  getListGamesQueryKey,
  useGetUserStats,
  getGetUserStatsQueryKey,
  useListGames,
} from "@workspace/api-client-react";
import { useCurrency, useMoney } from "@/lib/currency";
import { useCurrentUser } from "@/lib/current-user";
import { resolveGameImageUrl } from "@/lib/media";
import { openStoreUrl } from "@/lib/store-links";
import { apiFetch } from "@/lib/api-fetch";
import { EmptyState } from "@/components/empty-state";

export const CASHOUT_TARGET = 2.5;

/** Return the percentage of the unchanged cashout target reached by a base-currency balance. */
export function cashoutProgressForBalance(balance: number): number {
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  return Math.min((balance / CASHOUT_TARGET) * 100, 100);
}
const SUPPORTED_CURRENCIES = ["USD", "NGN", "GHS", "KES", "ZAR", "GBP", "CAD", "AUD", "EUR", "INR", "BRL", "MXN", "JPY", "CNY"];
const API_BASE = (import.meta.env.VITE_API_URL || "https://gamezoneapi-cp623ub2.manus.space").replace(/\/$/, "");
// Bright remains intentionally inactive until the native SDK and server verification contract are connected.
const BRIGHT_BONUS_ENABLED = false;
const BONUS_POPUP_DELAY_MS = 60_000;

export function HomePage() {
  const formatCurrency = useMoney();
  const { currency, setCurrency } = useCurrency();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [currencyStatus, setCurrencyStatus] = useState("");
  const [bonusPopupOpen, setBonusPopupOpen] = useState(false);
  const [bonusDetailsOpen, setBonusDetailsOpen] = useState(false);
  const [bonusPending, setBonusPending] = useState(1000);
  const [bonusStatus, setBonusStatus] = useState<"new" | "accepted" | "declined" | "completed">("new");
  const topTierOffer = ["USD", "GBP", "EUR", "CAD", "AUD"].includes(currency);
  const bonusTarget = topTierOffer ? "$1" : "₦1,000";
  const bonusDaily = topTierOffer ? "$0.01" : "₦1";
  const formatBonus = (value: number) => topTierOffer
    ? `$${Math.max(0, value).toFixed(2)}`
    : `₦${Math.max(0, Math.round(value)).toLocaleString("en-NG")}`;
  useEffect(() => setSelectedCurrency(currency), [currency]);

  useEffect(() => {
    if (!BRIGHT_BONUS_ENABLED || !user?.id) return;
    const timer = window.setTimeout(() => {
      try {
        const decision = localStorage.getItem(`rockcity:bonus-decision:${user.id}`) as typeof bonusStatus | null;
        const pending = Number(localStorage.getItem(`rockcity:bonus-pending:${user.id}`));
        if (decision === "accepted" || decision === "declined" || decision === "completed") {
          setBonusStatus(decision);
          if (Number.isFinite(pending) && pending >= 0) setBonusPending(pending);
          return;
        }
        setBonusPopupOpen(true);
      } catch {
        setBonusPopupOpen(true);
      }
    }, BONUS_POPUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [user?.id]);

  const acceptBonus = () => {
    if (!user?.id) return;
    const startingPending = topTierOffer ? 1 : 1000;
    setBonusStatus("accepted");
    setBonusPending(startingPending);
    setBonusPopupOpen(false);
    try {
      localStorage.setItem(`rockcity:bonus-decision:${user.id}`, "accepted");
      localStorage.setItem(`rockcity:bonus-pending:${user.id}`, String(startingPending));
    } catch {
      // The backend activation contract will replace this local presentation state.
    }
  };

  const declineBonus = () => {
    if (!user?.id) return;
    setBonusStatus("declined");
    setBonusPending(0);
    setBonusPopupOpen(false);
    try {
      localStorage.setItem(`rockcity:bonus-decision:${user.id}`, "declined");
      localStorage.setItem(`rockcity:bonus-pending:${user.id}`, "0");
    } catch {
      // Ignore storage failures and keep the current screen usable.
    }
  };

  const optOutBonus = () => {
    if (!user?.id) return;
    setBonusStatus("declined");
    setBonusPending(0);
    setBonusDetailsOpen(false);
    try {
      localStorage.setItem(`rockcity:bonus-decision:${user.id}`, "declined");
      localStorage.setItem(`rockcity:bonus-pending:${user.id}`, "0");
    } catch {
      // Ignore storage failures and keep the current screen usable.
    }
  };

  const bonusAccepted = bonusStatus === "accepted" || bonusStatus === "completed";
  const saveCurrency = async () => {
    setCurrencyStatus("Saving…");
    try {
      const response = await apiFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode: selectedCurrency }),
      });
      if (!response.ok) throw new Error("Could not save currency");
      setCurrencyStatus("Saved. This choice is now locked.");
      setCurrency(selectedCurrency);
    } catch {
      setCurrencyStatus("Could not save currency. Please try again.");
    }
  };
  const userId = user?.id;
  const bannedUser = user as (typeof user & { bannedAt?: string | null; banReason?: string | null }) | undefined;
  const isBanned = Boolean(bannedUser?.bannedAt);
  // Keep the entry visible so players know the feature exists, but never show a
  // balance or imply that rewards are active before Bright verification is live.
  const showCoupon = !isBanned;
  const { data: stats } = useGetUserStats(userId ?? 0, {
    query: { enabled: !!userId, queryKey: getGetUserStatsQueryKey(userId ?? 0) },
  });
  const { data: games = [], isLoading: isGamesLoading } = useListGames(undefined, {
    query: { queryKey: getListGamesQueryKey() },
  });

  const offers = games.slice(0, 5);
  const balance = Number(user?.balance ?? 0);
  const cashoutProgress = cashoutProgressForBalance(balance);
  const gamesPlayed = stats?.gamesPlayed ?? user?.gamesPlayed ?? 0;
  const showBonusPopup = bonusPopupOpen && !isBanned;

  return (
    <>
      {!user && !isUserLoading && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Account profile is not ready on the server yet. You are signed in — games and balance will appear once the backend finishes setup.
        </div>
      )}
      {showBonusPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050a]/80 px-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="bonus-title">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#ffe56a]/70 bg-[#151729] p-7 text-center shadow-[0_0_80px_rgba(255,211,59,.42)]">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#ffe21a]/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#00d57e]/30 blur-3xl" />
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#ffe21a] bg-gradient-to-br from-[#fff8a6] via-[#ffe21a] to-[#ff9d00] text-4xl shadow-[0_0_34px_rgba(255,226,26,.8)]">₦</div>
            <p className="relative mt-5 text-xs font-black uppercase tracking-[0.24em] text-[#ffe971]">Welcome to Rockcity</p>
            <h2 id="bonus-title" className="relative mt-2 text-4xl font-black leading-none text-white">Earn {bonusTarget} Bonus</h2>
            <button type="button" onClick={acceptBonus} className="relative mt-7 w-full rounded-2xl bg-gradient-to-r from-[#ffe21a] via-[#fff27a] to-[#ffad00] px-5 py-4 text-lg font-black text-[#271900] shadow-[0_8px_0_#b86a00,0_0_26px_rgba(255,226,26,.42)] transition hover:brightness-110 active:translate-y-1 active:shadow-[0_4px_0_#b86a00]">Accept bonus</button>
            <button type="button" onClick={declineBonus} className="relative mt-4 text-sm font-semibold text-[#aaa9bb] hover:text-white">Maybe later</button>
          </div>
        </div>
      )}
      {bonusDetailsOpen && showCoupon && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#02050a]/70 px-4 pb-5 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="bonus-details-title">
          <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-[#171827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffe971]">Rockcity bonus</p><h2 id="bonus-details-title" className="mt-2 text-2xl font-black text-white">Coming soon</h2></div>
              <button type="button" onClick={() => setBonusDetailsOpen(false)} className="rounded-full px-3 py-1 text-2xl text-[#aaa9bb] hover:bg-white/10 hover:text-white" aria-label="Close bonus details">×</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#c7c6d4]">The Rockcity bonus will appear here after the Bright SDK is connected and your activity can be verified. No pending balance or daily accrual is active yet.</p>
            <div className="mt-5 rounded-2xl bg-[#0f1020] p-4 text-sm text-[#d9d8e5]"><p>Status <strong className="float-right text-[#ffe971]">Not active yet</strong></p><p className="mt-2">Balance effect <strong className="float-right text-[#aaa9bb]">None</strong></p></div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-5xl space-y-10 pb-8 md:space-y-12">
      {isBanned && (
        <section role="alert" className="rounded-2xl border-2 border-red-500/80 bg-red-950/70 p-5 text-red-100 shadow-[0_0_28px_rgba(239,68,68,.18)] md:p-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">Account restricted</p>
          <h2 className="mt-2 text-xl font-bold md:text-2xl">Your Rockcity account has been banned</h2>
          <p className="mt-2 text-sm leading-6 text-red-100/90">You cannot earn rewards or request withdrawals while this restriction is active. {bannedUser?.banReason ? `Reason: ${bannedUser.banReason}` : "Please contact support if you believe this is a mistake."}</p>
        </section>
      )}
      <section className="space-y-5">
        <div className="flex items-center justify-center gap-3 md:gap-5">
          <details className="group relative">
            <summary className="flex min-w-[148px] cursor-pointer list-none items-center justify-center gap-2 rounded-2xl border border-primary/45 bg-card px-4 py-3 text-xl font-bold text-foreground shadow-sm outline-none transition hover:border-primary/70 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary md:min-w-[220px] md:px-7 md:py-4 md:text-3xl">
              <span>{isUserLoading ? "—" : formatCurrency(balance)}</span>
            </summary>
            <div className="absolute left-1/2 top-full z-20 mt-3 w-[min(88vw,330px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#171827] p-4 text-left text-sm font-normal shadow-2xl">
              <p className="font-semibold text-white">Choose display currency</p>
              <p className="mt-1 text-xs leading-5 text-[#aaa9bb]">Automatic detection is used only until you save a choice. Your saved currency will not be changed by future IP or device checks.</p>
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[#aaa9bb]" htmlFor="dashboard-currency">Currency</label>
              <select id="dashboard-currency" value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#111322] px-3 text-white outline-none focus:border-[#00d57e]">
                {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
              <button type="button" onClick={() => void saveCurrency()} className="mt-3 h-11 w-full rounded-xl bg-[#00d57e] font-bold text-[#071b13] transition hover:bg-[#22e696]">Save currency</button>
              {currencyStatus && <p className="mt-2 text-xs text-[#8ef0bd]" role="status">{currencyStatus}</p>}
            </div>
          </details>
          {showCoupon && (
            <button type="button" onClick={() => setBonusDetailsOpen(true)} className="flex min-w-[116px] items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xl font-bold text-foreground shadow-sm transition hover:border-accent/70 hover:bg-secondary md:min-w-[200px] md:px-7 md:py-4 md:text-3xl" aria-label="Open Rockcity bonus details">
              <Ticket className="h-5 w-5 text-[#ffe21a]" />
              <span className="text-base md:text-xl">Bonus soon</span>
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-center text-xl font-semibold tracking-tight text-foreground md:text-3xl">Next cashout</div>
        <p className="text-center text-sm text-[#aaa9bb] md:text-base">{isBanned ? "Cashout and reward earning are unavailable while your account is banned." : balance > 0 ? `${formatCurrency(balance)} earned toward ${formatCurrency(CASHOUT_TARGET)} minimum` : `Earn ${formatCurrency(CASHOUT_TARGET)} to reach the cashout minimum`}</p>
                <div className="h-3 overflow-hidden rounded-full bg-secondary p-0.5 md:h-4" role="progressbar"
 aria-label="Cashout progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cashoutProgress)}>
          <div className={`flex h-full items-center justify-end rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-[width] duration-700 ${cashoutProgress > 0 ? "px-5" : "px-0"}`} style={{ width: `${cashoutProgress}%`, minWidth: cashoutProgress > 0 ? "2px" : "0px" }}>
            <span className={cashoutProgress === 0 ? "sr-only" : ""}>{formatCurrency(balance)} / {formatCurrency(CASHOUT_TARGET)}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">Best for you</h2>

        {games.length > 0 ? (
          <div className="space-y-4">
            {games.map((game) => <OfferCard key={game.id} game={game} featured formatCurrency={formatCurrency} disabled={isBanned} />)}
          </div>
        ) : isGamesLoading ? (
          <div className="h-[390px] animate-pulse rounded-3xl bg-[#1b1c2b]" />
        ) : (
          <EmptyState
            title="No offers yet"
            message="Games will show up here when they are available."
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-white">More offers</h2>
          <Link href="/games" className="text-sm text-muted-foreground hover:text-white">View all</Link>
        </div>

        {offers.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {offers.map((game) => <OfferCard key={game.id} game={game} formatCurrency={formatCurrency} disabled={isBanned} />)}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No more offers right now.{" "}
            <Link href="/games" className="text-primary hover:underline">Browse games</Link>
          </p>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {gamesPlayed > 0 ? `${gamesPlayed} games played` : "Play a game to start earning"}
      </p>
      </div>
    </>
  );
}

function OfferCard({ game, featured = false, formatCurrency, disabled = false }: { game: any; featured?: boolean; formatCurrency: (value: number) => string; disabled?: boolean }) {
  const [milestoneTotal, setMilestoneTotal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/games/${game.id}/milestones`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload) ? payload : Array.isArray(payload?.milestones) ? payload.milestones : [];
      })
      .then((items) => {
        if (!cancelled) setMilestoneTotal(items.filter((item: any) => item?.isActive !== false).reduce((sum: number, item: any) => sum + Math.max(0, Number(item?.rewardAmount) || 0), 0));
      })
      .catch(() => { if (!cancelled) setMilestoneTotal(0); });
    return () => { cancelled = true; };
  }, [game.id]);
  const reward = milestoneTotal;
  const storeUrl = typeof game.storeUrl === "string" && /^https?:\/\//i.test(game.storeUrl)
    ? game.storeUrl
    : typeof game.gameUrl === "string" && /^https?:\/\//i.test(game.gameUrl)
      ? game.gameUrl
      : null;
  const detailHref = `/games/${game.id}`;
  const content = (
    <div className={`group block overflow-hidden rounded-[1.35rem] border border-border/80 bg-card shadow-[0_18px_55px_-40px_rgb(0_0_0_/_0.9)] transition ${disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[0_22px_60px_-38px_hsl(var(--primary)/.35)]"} ${featured ? "" : "min-w-0"}`}>
      <Link href={detailHref} className="block">
                  <div className={`${featured ? "h-64 sm:h-80" : "h-36 sm:h-44"} relative overflow-hidden bg-secondary`}>

          {resolveGameImageUrl(game.thumbnailUrl) ? <img src={resolveGameImageUrl(game.thumbnailUrl)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-center text-2xl font-black uppercase leading-none text-[#ffe900]">{game.title}</div>}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        </div>
        <div className={`${featured ? "p-5" : "p-4"} space-y-3`}>
          <p className={`${featured ? "text-2xl" : "text-base"} truncate font-semibold text-foreground`}>{game.title}</p>
          <p className="truncate text-sm text-muted-foreground">{game.description || "Install and play to earn rewards"}</p>
        </div>
      </Link>
      <div className={`${featured ? "px-5 pb-5" : "px-4 pb-4"}`}>
        {disabled || !storeUrl ? <div className={`${featured ? "py-4 text-xl" : "py-3 text-sm"} rounded-xl bg-primary text-center font-bold text-primary-foreground transition-opacity hover:opacity-90`}>{disabled ? "Earning unavailable" : `View milestones · ${formatCurrency(reward)}`}</div> : <a href={storeUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => openStoreUrl(storeUrl, event)} className={`${featured ? "py-4 text-xl" : "py-3 text-sm"} block rounded-xl bg-primary text-center font-bold text-primary-foreground transition-opacity hover:opacity-90`}>Play and Earn {formatCurrency(reward)}</a>}
      </div>
    </div>
  );
  return content;
}
