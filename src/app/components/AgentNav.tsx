// AgentNav.tsx - Main navigation component (refactored)

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { getNavItems } from "./agent-nav/constants";
import { getVisibleNavItems } from "./agent-nav/utils";
import { useMobileMenu } from "./agent-nav/hooks";
import { BackButton, MobileMenuButton, DesktopNav, MobileNav } from "./agent-nav/components";

export default function AgentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTheme } = useTheme();
  const { textSecondary, textPrimary, border, cardBg } = useThemeClasses();
  const { data: session } = useSession();

  const isLight = currentTheme === "lightgradient";
  const user = session?.user as any;
  const isTeamLeader = user?.isTeamLeader;

  // Mobile menu state
  const { isOpen, toggle, close } = useMobileMenu();

  // Navigation items
  const allNavItems = getNavItems(isTeamLeader);
  const visibleNavItems = getVisibleNavItems(allNavItems);

  return (
    <nav className="mb-2 md:mb-4">
      {/* Back button - fixed on mobile, static on desktop */}
      <BackButton onBack={() => router.back()} isLight={isLight} />

      {/* Mobile hamburger button - fixed positioned */}
      <MobileMenuButton isOpen={isOpen} onToggle={toggle} isLight={isLight} />

      {/* Desktop navigation - horizontal tabs */}
      <DesktopNav
        navItems={visibleNavItems}
        pathname={pathname}
        isLight={isLight}
        textSecondary={textSecondary}
        border={border}
      />

      {/* Mobile navigation - overlay menu */}
      <MobileNav
        isOpen={isOpen}
        onClose={close}
        navItems={visibleNavItems}
        pathname={pathname}
        isLight={isLight}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        cardBg={cardBg}
        border={border}
      />
    </nav>
  );
}
