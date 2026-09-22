import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useAppAuth, useConfigureApiAuth } from '@/lib/clerk-auth';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { SignIn, SignUp, ClerkLoaded, ClerkLoading } from '@clerk/react';
import { Route, Switch, Router as WouterRouter, Link, Redirect, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/app-layout';
import { CurrencyProvider } from '@/lib/currency';

import { HomePage } from '@/pages/home';
import { GamesPage } from '@/pages/games';
import { GameDetailPage } from '@/pages/game-detail';
import { PlayPage } from '@/pages/play';
import { LeaderboardPage } from '@/pages/leaderboard';
import { EarningsPage } from '@/pages/earnings';
import { UploadPage } from '@/pages/upload';
import { ProfilePage } from '@/pages/profile';
import { DashboardPage } from '@/pages/dashboard';

import NotFound from '@/pages/not-found';
import { Gamepad2, Trophy, Zap, Target, Sparkles, Dice5, Crown, Rocket, Star, Swords, Coins, Gift } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function PublicLanding() {
  // Decorative game-tile background only (original icons, not scraped brand art)
  const tileIcons = [Gamepad2, Trophy, Zap, Target, Sparkles, Dice5, Crown, Rocket, Star, Swords, Coins, Gift];
  const tileColors = [
    'bg-emerald-500/15 text-emerald-400/70',
    'bg-sky-500/15 text-sky-400/70',
    'bg-violet-500/15 text-violet-400/70',
    'bg-amber-500/15 text-amber-400/70',
    'bg-rose-500/15 text-rose-400/60',
    'bg-teal-500/15 text-teal-400/70',
    'bg-lime-500/15 text-lime-400/60',
    'bg-indigo-500/15 text-indigo-400/70',
    'bg-fuchsia-500/15 text-fuchsia-400/60',
    'bg-cyan-500/15 text-cyan-400/70',
    'bg-orange-500/15 text-orange-400/60',
    'bg-emerald-400/15 text-emerald-300/70',
  ];

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <div className="absolute inset-0 grid grid-cols-4 gap-3 p-4 opacity-40 sm:grid-cols-6 sm:gap-4 sm:p-6">
          {Array.from({ length: 24 }).map((_, i) => {
            const Icon = tileIcons[i % tileIcons.length];
            const color = tileColors[i % tileColors.length];
            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-2xl border border-white/5 ${color}`}
                style={{
                  transform: `rotate(${(i % 5) * 3 - 6}deg) scale(${0.9 + (i % 3) * 0.03})`,
                }}
              >
                <Icon className="size-7 sm:size-8" strokeWidth={1.5} />
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/75 via-zinc-950/88 to-zinc-950" />
      </div>

      <header className="relative z-10 border-b border-zinc-900/80">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-white">
            Rock City
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-400 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-20 pt-16 sm:pt-24">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
          Play games.
          <br />
          Earn coins.
        </h1>
        <p className="mt-5 max-w-md text-[16px] leading-7 text-zinc-400">
          Find games, play, and watch your coins grow in one account.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center rounded-lg bg-emerald-500 px-5 text-[14px] font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Create account
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center rounded-lg border border-zinc-800 bg-zinc-950/60 px-5 text-[14px] font-medium text-zinc-200 backdrop-blur-sm hover:border-zinc-700 hover:bg-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="relative z-10 border-t border-zinc-900">
        <div className="mx-auto grid max-w-5xl gap-px bg-zinc-900 sm:grid-cols-3">
          {[
            { title: 'Games', body: 'Browse what’s available and jump into a session.' },
            { title: 'Progress', body: 'Your play history and rewards stay on your profile.' },
            { title: 'Rewards', body: 'Track coins earned from the games you play.' },
          ].map((item) => (
            <div key={item.title} className="bg-zinc-950 px-5 py-8 sm:px-6">
              <h2 className="text-[14px] font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-[14px] leading-6 text-zinc-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 text-[12px] text-zinc-600">
          <span>Rock City</span>
          <Link href="/sign-up" className="hover:text-zinc-400">
            Get started
          </Link>
        </div>
      </footer>
    </main>
  );
}

function AuthScreen({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const auth = useAppAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (auth.isSignedIn) navigate('/');
  }, [auth.isSignedIn, navigate]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const homeUrl = `${origin}${base}`;
  const signInUrl = `${origin}${base}sign-in`;
  const signUpUrl = `${origin}${base}sign-up`;
  const isSignIn = mode === 'sign-in';

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[380px] flex-col justify-center px-5 py-14">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <span aria-hidden="true">←</span> Rock City
        </Link>

        <div className="mb-8">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-white">
            {isSignIn ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-zinc-500">
            {isSignIn
              ? 'Sign in to keep playing and track rewards.'
              : 'Join Rock City to play and follow your progress.'}
          </p>
        </div>

        <div className="w-full min-h-[300px]">
          <ClerkLoading>
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-pulse rounded-full bg-zinc-800" />
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            {isSignIn ? (
              <SignIn
                routing="hash"
                signUpUrl={signUpUrl}
                forceRedirectUrl={homeUrl}
                fallbackRedirectUrl={homeUrl}
                appearance={clerkAppearance}
              />
            ) : (
              <SignUp
                routing="hash"
                signInUrl={signInUrl}
                forceRedirectUrl={homeUrl}
                fallbackRedirectUrl={homeUrl}
                appearance={clerkAppearance}
              />
            )}
          </ClerkLoaded>
        </div>

        <p className="mt-10 text-center text-[13px] text-zinc-500">
          {isSignIn ? (
            <>
              New here?{' '}
              <Link href="/sign-up" className="font-medium text-zinc-200 underline-offset-4 hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/sign-in" className="font-medium text-zinc-200 underline-offset-4 hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

function AuthLoading({ error, retry }: { error?: unknown; retry: () => void }) {
  const message = error instanceof Error ? error.message : 'The session check is taking longer than expected.';
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0a1110] px-4 text-[#f2fff5]">
      <div className="w-full max-w-md rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-[0_24px_80px_-48px_rgb(0_0_0_/_0.9)]">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#39e36b]/30" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold">Connecting to Rockcity</h1>
        <p className="mt-3 text-sm leading-6 text-[#b1c9b8]">{message}</p>
        <button type="button" onClick={retry} className="mt-6 rounded-xl bg-[#39e36b] px-5 py-3 font-bold text-[#06200d]">Try again</button>
        <Link href="/" className="ml-3 text-sm text-[#62f07f] hover:underline">Continue as visitor</Link>
      </div>
    </main>
  );
}

function useAuthGate() {
  const auth = useAppAuth();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (auth.isLoaded) return;
    const timer = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [auth.isLoaded]);
  const retry = () => { setTimedOut(false); window.location.reload(); };
  return { ...auth, timedOut, retry };
}

function HomeRedirect() {
  const { isSignedIn } = useAppAuth();
  // The public landing page must not wait for authentication or an API cold start.
  // Signed-in users are upgraded to the app shell as soon as their session is known.
  return isSignedIn ? <AppLayout><HomePage /></AppLayout> : <PublicLanding />;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, error, timedOut, retry } = useAuthGate();
  if (!isLoaded && !timedOut) return <AuthLoading retry={retry} />;
  if (timedOut) return <AuthLoading error={error} retry={retry} />;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <AppLayout>{children}</AppLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={() => <AuthScreen mode="sign-in" />} />
      <Route path="/sign-up/*?" component={() => <AuthScreen mode="sign-up" />} />
      <Route path="/games"><Protected><GamesPage /></Protected></Route>
      <Route path="/games/:id"><Protected><GameDetailPage /></Protected></Route>
      <Route path="/play/:id"><Protected><PlayPage /></Protected></Route>
      <Route path="/leaderboard"><Protected><LeaderboardPage /></Protected></Route>
      <Route path="/earnings"><Protected><EarningsPage /></Protected></Route>
      <Route path="/upload"><Protected><UploadPage /></Protected></Route>
      <Route path="/profile/:id"><Protected><ProfilePage /></Protected></Route>
      <Route path="/dashboard"><Protected><DashboardPage /></Protected></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ApiAuthWiring() {
  // Registers Clerk's session token with the shared API client so every
  // request carries an Authorization: Bearer header. Must run before any
  // page below it fires a data fetch.
  useConfigureApiAuth();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiAuthWiring />
      <CurrencyProvider>
        <WouterRouter base={basePath}><Router /></WouterRouter>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

export default App;
