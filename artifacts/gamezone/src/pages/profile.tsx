import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useGetUserStats, getGetUserStatsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useCurrency, useMoney, BASE_CURRENCY } from "@/lib/currency";
import { useCurrentUser } from "@/lib/current-user";
import { useAppAuth } from "@/lib/clerk-auth";
import { apiFetch } from "@/lib/api-fetch";
import { User, Calendar, Gamepad2, Coins, ChevronDown, LogOut } from "lucide-react";

const COUNTRY_CODES = [
  { code: "US", label: "US" },
  { code: "NG", label: "NG" },
  { code: "GH", label: "GH" },
  { code: "KE", label: "KE" },
  { code: "ZA", label: "ZA" },
  { code: "GB", label: "GB" },
  { code: "CA", label: "CA" },
  { code: "AU", label: "AU" },
  { code: "DE", label: "DE" },
  { code: "FR", label: "FR" },
  { code: "IN", label: "IN" },
  { code: "BR", label: "BR" },
  { code: "MX", label: "MX" },
  { code: "JP", label: "JP" },
  { code: "CN", label: "CN" },
];

const CURRENCY_CODES = [
  BASE_CURRENCY,
  "NGN",
  "GHS",
  "KES",
  "ZAR",
  "GBP",
  "CAD",
  "AUD",
  "EUR",
  "INR",
  "BRL",
  "MXN",
  "JPY",
  "CNY",
];

const COUNTRY_KEY = "gamezone:country-code";

export function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const { logout } = useAppAuth();
  const formatCurrency = useMoney();
  const { currency, setCurrency } = useCurrency();
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    isError: isCurrentUserError,
    refetch: refetchCurrentUser,
  } = useCurrentUser();

  const routeId = params?.id ? parseInt(params.id, 10) : NaN;
  const id = Number.isFinite(routeId) ? routeId : Number(currentUser?.id ?? 0);

  const { data: stats, isLoading: isStatsLoading, isError: isStatsError, refetch: refetchStats } = useGetUserStats(id, {
    query: { enabled: id > 0, retry: 1, refetchOnWindowFocus: false, queryKey: getGetUserStatsQueryKey(id) }
  });

  // The current-user response already contains the complete profile. Using it
  // directly prevents a second user request from trapping this page in loading.
  const user = currentUser;

  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [preferredCurrency, setPreferredCurrency] = useState(currency);
  const [payoutMethods, setPayoutMethods] = useState<string[]>([]);
  const [payoutProfiles, setPayoutProfiles] = useState<Array<{ id: number; method: string; label: string }>>([]);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("paypal");
  const [payoutDetails, setPayoutDetails] = useState({ accountName: "", email: "", bankName: "", accountNumber: "", iban: "", accountIdentifier: "", phone: "" });
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (user?.username) setDisplayName(user.username);
  }, [user?.username]);

  useEffect(() => {
    setPreferredCurrency(currency);
  }, [currency]);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch("/api/payout-methods", { cache: "no-store" }).then((response) => response.json()).then((data) => { setPayoutMethods(data.methods || []); setPayoutProfiles(data.profiles || []); setPayoutMethod((data.methods || ["paypal"])[0]); }).catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COUNTRY_KEY);
      const persisted = (user as typeof user & { countryCode?: string | null })?.countryCode;
      if (persisted) setCountryCode(persisted);
      else if (saved) setCountryCode(saved);
    } catch {
      // ignore
    }
  }, [user]);

  if (isCurrentUserLoading || isStatsLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isCurrentUserError || isStatsError || !user || id <= 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">Profile temporarily unavailable</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Your authenticated profile is still synchronizing. Retry without leaving this page.</p>
        <button type="button" onClick={() => { void refetchCurrentUser(); void refetchStats(); }} className="mt-6 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90">Retry profile</button>
      </div>
    );
  }

  const gamesPlayed = stats?.gamesPlayed ?? 0;
  const totalEarnings = stats?.totalEarnings ?? 0;
  const memberSince = format(new Date(user.createdAt), "M/d/yyyy");
  const avatarInitial = (displayName || user.username || "?").charAt(0).toUpperCase();

  const emptyPayoutDetails = { accountName: "", email: "", bankName: "", accountNumber: "", iban: "", accountIdentifier: "", phone: "" };
  const selectedMethodAlreadySaved = payoutProfiles.some((profile) => profile.method === payoutMethod && profile.id !== editingProfileId);
  const handleEditPayout = (profile: { id: number; method: string; label: string }) => {
    setEditingProfileId(profile.id);
    setPayoutMethod(profile.method);
    setPayoutDetails(emptyPayoutDetails);
    toast({ title: `Edit ${profile.method === "bank_transfer" ? "bank transfer" : profile.method}`, description: "Enter the complete replacement details, then save." });
  };
  const handleCancelEditPayout = () => { setEditingProfileId(null); setPayoutDetails(emptyPayoutDetails); };
  const handleSavePayout = async () => {
    try {
      const endpoint = editingProfileId ? `/api/payout-methods/${editingProfileId}` : `/api/payout-methods`;
      const response = await apiFetch(endpoint, { method: editingProfileId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countryCode, method: payoutMethod, details: payoutDetails }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save payout method");
      setPayoutProfiles((current) => editingProfileId ? current.map((profile) => profile.id === editingProfileId ? data : profile) : [data, ...current]);
      setEditingProfileId(null);
      setPayoutDetails(emptyPayoutDetails);
      toast({ title: editingProfileId ? "Payout method updated" : "Payout method saved", description: "This method is now available for manual withdrawal requests." });
    } catch (error) { toast({ title: "Payout method not saved", description: error instanceof Error ? error.message : "Please check the details.", variant: "destructive" }); }
  };

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) { setSupportStatus("Add a subject and message first."); return; }
    setSupportStatus("Sending…");
    try {
      const response = await apiFetch("/api/support/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: supportSubject.trim(), message: supportMessage.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send support message");
      setSupportSubject(""); setSupportMessage(""); setSupportStatus("Message sent to Rockcity support.");
    } catch (error) { setSupportStatus(error instanceof Error ? error.message : "Unable to send support message"); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    setIsDeletingAccount(true);
    try {
      const response = await apiFetch("/api/users/me", { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to delete your account");
      }
      toast({ title: "Account deleted", description: "Your Rockcity account and all associated data have been permanently removed." });
      await logout();
    } catch (error) {
      setIsDeletingAccount(false);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Unable to delete your account", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem(COUNTRY_KEY, countryCode);
      const response = await apiFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, currencyCode: preferredCurrency }),
      });
      if (!response.ok) throw new Error("Country preference could not be saved");
      if (preferredCurrency !== currency) setCurrency(preferredCurrency);
      toast({ title: "Saved", description: "Your country and profile preferences have been updated." });
    } catch {
      toast({ title: "Error", description: "Could not save your country preference.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account details and payout preferences.</p>
      </div>

      {/* User Card */}
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={user.avatarUrl || ""} className="object-cover" />
          <AvatarFallback className="bg-secondary text-base font-medium text-foreground">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{displayName || user.username}</h2>
          <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="divide-y divide-border/60 border-y border-border/60">
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">Member since</span>
          <span className="text-sm font-medium text-foreground">{memberSince}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">Games played</span>
          <span className="text-sm font-medium text-foreground">{gamesPlayed}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-muted-foreground">Lifetime earnings</span>
          <span className="text-sm font-medium text-foreground">{formatCurrency(totalEarnings)}</span>
        </div>
      </div>

      {/* Edit Details */}
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-5 space-y-6">
          <h3 className="text-sm font-semibold text-foreground">Edit details</h3>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm text-muted-foreground font-normal">
              Display name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12 bg-input border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="countryCode" className="text-sm text-muted-foreground font-normal">
              Country code
            </Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger id="countryCode" className="h-12 bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredCurrency" className="text-sm text-muted-foreground font-normal">
              Preferred currency
            </Label>
            <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
              <SelectTrigger id="preferredCurrency" className="h-12 bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Detected once from your IP when available. Save a currency to lock your choice across devices.
            </p>
          </div>

          <Button
            onClick={handleSave}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider rounded-xl"
          >
            Save changes
          </Button>
          <div className="space-y-4 border-t border-border/60 pt-6">
            <div><h3 className="text-sm font-semibold text-foreground">Payout methods</h3><p className="text-sm text-muted-foreground">Available for {countryCode}: {payoutMethods.join(", ") || "PayPal"}. No payment is sent automatically.</p></div>
            {payoutProfiles.length > 0 && <div className="space-y-2">{payoutProfiles.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 border-b border-border/40 py-3 text-sm last:border-0"><span className="min-w-0 truncate">{profile.label}</span><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Saved</span><Button type="button" variant="outline" size="sm" onClick={() => handleEditPayout(profile)}>Edit</Button></div></div>)}</div>}
            <select value={payoutMethod} onChange={(event) => { setPayoutMethod(event.target.value); setEditingProfileId(null); }} className="h-12 w-full rounded-md border border-border bg-input px-3 text-sm">{payoutMethods.map((method) => <option key={method} value={method}>{method === "bank_transfer" ? "Direct bank transfer" : method === "paypal" ? "PayPal" : method === "opay" ? "Opay" : "PalmPay"}</option>)}</select>
            {selectedMethodAlreadySaved && <p className="text-sm text-muted-foreground">A {payoutMethod === "bank_transfer" ? "bank transfer" : payoutMethod} account is already saved. Choose another method or press Edit above to change it.</p>}
            <Input placeholder="Account holder name" value={payoutDetails.accountName} onChange={(event) => setPayoutDetails({ ...payoutDetails, accountName: event.target.value })} />
            {payoutMethod === "paypal" ? <Input type="email" placeholder="PayPal email" value={payoutDetails.email} onChange={(event) => setPayoutDetails({ ...payoutDetails, email: event.target.value })} /> : payoutMethod === "bank_transfer" ? <div className="grid gap-3 sm:grid-cols-2"><Input placeholder="Bank name" value={payoutDetails.bankName} onChange={(event) => setPayoutDetails({ ...payoutDetails, bankName: event.target.value })} /><Input placeholder="Account number or IBAN" value={payoutDetails.accountNumber || payoutDetails.iban} onChange={(event) => setPayoutDetails({ ...payoutDetails, accountNumber: event.target.value, iban: event.target.value })} /></div> : <Input placeholder={`${payoutMethod === "opay" ? "Opay" : "PalmPay"} phone or account ID`} value={payoutDetails.accountIdentifier} onChange={(event) => setPayoutDetails({ ...payoutDetails, accountIdentifier: event.target.value, phone: event.target.value })} />}
            <div className="flex gap-2"><Button type="button" disabled={selectedMethodAlreadySaved} onClick={() => void handleSavePayout()} className="flex-1">{editingProfileId ? "Update payout method" : "Save payout method"}</Button>{editingProfileId && <Button type="button" variant="outline" onClick={handleCancelEditPayout}>Cancel</Button>}</div>
          </div>

          <div className="space-y-4 border-t border-border/60 pt-6">
            <div><h3 className="text-sm font-semibold text-foreground">Contact support</h3><p className="text-sm text-muted-foreground">Send a message to the Rockcity owner. Replies will appear in your notification bell.</p></div>
            <Input placeholder="Subject" value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} />
            <textarea className="min-h-28 w-full rounded-md border border-border bg-input px-3 py-3 text-sm" placeholder="Tell us what you need help with" value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} />
            <Button type="button" onClick={() => void handleSendSupport()} className="w-full h-12 rounded-xl font-bold">Send to support</Button>
            {supportStatus && <p className="text-sm text-muted-foreground">{supportStatus}</p>}
          </div>

          <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
              <p className="text-sm text-muted-foreground">Permanently deletes your Rockcity account, balance, play history, payout methods, and messages. This cannot be undone.</p>
            </div>
            <Input placeholder='Type "DELETE" to confirm' value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} />
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || isDeletingAccount}
              onClick={() => void handleDeleteAccount()}
              className="h-11 w-full font-bold"
            >
              {isDeletingAccount ? "Deleting…" : "Permanently delete my account"}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void logout()}
            className="h-11 w-full border-border text-sm text-muted-foreground hover:text-destructive"
          >
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
