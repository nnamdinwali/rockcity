import { Gamepad2, Trophy, Coins, Upload, User, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

/**
 * Build the menu for the current visitor.
 *
 * - "Upload Game" is admin-only: players do not add games to the arcade.
 * - "Profile" points at the signed-in player's own profile page.
 */
export function getNavLinks({
  profileId,
  isAdmin,
}: {
  profileId?: number | string | null;
  isAdmin?: boolean;
}): NavLink[] {
  const links: NavLink[] = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/games", label: "All Games", icon: Gamepad2 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/earnings", label: "Coins", icon: Coins },
    { href: profileId ? `/profile/${profileId}` : "/profile", label: "Profile", icon: User },
  ];

  if (isAdmin) {
    links.push({ href: "/upload", label: "Upload Game", icon: Upload });
  }

  return links;
}
