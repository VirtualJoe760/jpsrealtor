"use client"; // Ensure client-side rendering

import { usePathname } from "next/navigation";

const navigation = [
  { name: "About", href: "/about" },
  { name: "Buying", href: "/buying" },
  { name: "Selling", href: "/selling" },
  { name: "Listings", href: "https://www.obsidianregroup.com/team/joseph-sardella" },
  { name: "Coachella Valley", href: "/coachella-valley" },
  { name: "Sign-in", href: "/auth/sign-in" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function DesktopMenu() {
  const pathname = usePathname(); // Get the current pathname

  return (
    <div className="hidden sm:ml-6 sm:block">
      <div className="flex space-x-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                isActive
                  ? "bg-neutral-light text-neutral-dark"
                  : "text-white hover:text-gray-300",
                "rounded-md px-3 py-2 text-sm font-medium"
              )}
            >
              {item.name}
            </a>
          );
        })}
      </div>
    </div>
  );
}