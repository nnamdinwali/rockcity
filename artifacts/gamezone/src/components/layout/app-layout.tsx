import { useEffect, useState } from "react";
import { useAppAuth } from "@/lib/clerk-auth";
import { Link, useLocation } from "wouter";
import { Bell, Gift, LogOut, Ticket, UserRound } from "lucide-react";
import { IconEarn, IconOffers, IconCashout, IconRewards } from "./tab-icons";
import { Toaster } from "@/components/ui/toaster";
import { useCurrentUser } from "@/lib/current-user";
import { useNotifications } from "@/lib/notifications";
import { ErrorBoundary } from "@/components/error-boundary";
import { useMoney } from "@/lib/currency";

const bottomLinks = [
  { href: "/", label: "Earn", icon: IconEarn },
  { href: "/games", label: "My Offers", icon: IconOffers },
  { href: "/earnings", label: "Coins", icon: IconCashout },
  { href: "/leaderboard", label: "Rewards", icon: IconRewards },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user: sessionUser, logout } = useAppAuth();
  const { data: currentUser } = useCurrentUser();
  const formatMoney = useMoney();
  const [location] = useLocation();
  const profileHref = currentUser?.id ? `/profile/${currentUser.id}` : "/profile";
  const avatar = currentUser?.avatarUrl || sessionUser?.avatarUrl || null;
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  useEffect(() => {
    setFailedAvatar(null);
  }, [avatar]);
  const showAvatar = Boolean(avatar && avatar !== failedAvatar);
  const initials = (currentUser?.username || sessionUser?.username || "P").slice(0, 1).toUpperCase();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: notificationData, isLoading: notificationsLoading, isError: notificationsError, refetch: refetchNotifications, markRead } = useNotifications(Boolean(currentUser?.id));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative min-h-screen min-w-0">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 px-4 py-3.5 backdrop-blur-xl sm:px-6 md:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link href={profileHref} className="flex items-center gap-3 rounded-2xl" data-testid="link-session-profile">
              <div className="h-11 w-11 overflow-hidden rounded-2xl border border-border/80 bg-secondary shadow-sm">
                {showAvatar ? (
                  <img
                    src={avatar ?? undefined}
                    alt={`${currentUser?.username || sessionUser?.username || "Player"} profile`}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedAvatar(avatar)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-[#d5d4df]">{initials}</div>
                )}
              </div>
              <span className="hidden text-sm font-semibold text-foreground sm:block">{currentUser?.username || sessionUser?.username || "Player"}</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/earnings" className="hidden items-center gap-2 rounded-xl border border-primary/45 bg-primary/8 px-3 py-2 text-sm font-bold text-foreground shadow-sm sm:flex">{formatMoney(Number(currentUser?.balance ?? 0))}</Link>
              <Link href="/games" className="hidden items-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-bold text-foreground shadow-sm sm:flex"><Ticket className="h-4 w-4 text-muted-foreground" />0</Link>
              <div className="relative">
                <button type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-full p-2 text-[#9998aa] hover:bg-white/5 hover:text-white">
                  <Bell className="h-6 w-6 fill-current" strokeWidth={1.5} />
                  {(notificationData?.unreadCount ?? 0) > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-[#10111f] bg-[#00d57e]" aria-label={`${notificationData?.unreadCount} unread notifications`} />}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1b2b] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <h2 className="text-sm font-semibold text-white">Notifications</h2>
                      <span className="text-xs text-[#aaa9bb]">{notificationData?.unreadCount ?? 0} unread</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsLoading ? <p className="px-4 py-6 text-sm text-[#aaa9bb]">Loading notifications…</p> : notificationsError ? <div className="space-y-3 px-4 py-6 text-sm text-[#f0a7a7]"><p>Notifications are temporarily unavailable.</p><button type="button" onClick={() => void refetchNotifications()} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Try again</button></div> : notificationData?.notifications.length ? notificationData.notifications.map((notification) => (
                        <button key={notification.id} type="button" onClick={() => { if (!notification.readAt) markRead.mutate(notification.id); }} className={`block w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/5 ${notification.readAt ? "opacity-70" : ""}`}>
                          <div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-white">{notification.title}</span>{!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00d57e]" />}</div>
                          <p className="mt-1 text-sm leading-5 text-[#c0bfd0]">{notification.message}</p>
                          <time className="mt-2 block text-[11px] text-[#89889a]" dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
                        </button>
                      )) : <p className="px-4 py-6 text-sm text-[#aaa9bb]">No notifications yet.</p>}
                    </div>
                  </div>
                )}
              </div>
              {!location.startsWith("/profile") && <button type="button" onClick={() => void logout()} aria-label="Log out" className="hidden rounded-full p-2 text-[#9998aa] hover:bg-white/5 hover:text-white md:block"><LogOut className="h-5 w-5" /></button>}
            </div>
          </div>
        </header>

                <nav className="hidden border-b border-border/60 bg-background/70 px-4 py-2.5 backdrop-blur-xl md:block"
 aria-label="Primary desktop navigation">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 sm:gap-4 md:px-6">
            {bottomLinks.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link
                  key={`desktop-${href}`}
                  href={href}
                  className={`flex min-w-28 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mx-auto max-w-6xl px-4 pb-28 pt-7 sm:px-6 md:px-10 md:pb-10">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/96 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {bottomLinks.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium ${
                  active ? "text-[#00c853]" : "text-[#8b8b9a]"
                }`}
              >
                <span
                  className={`relative flex h-[34px] w-[34px] items-center justify-center rounded-[10px] ${
                    active ? "bg-[#00c853] text-[#0b0b12]" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <Toaster />
    </div>
  );
}
