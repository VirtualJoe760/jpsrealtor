"use client";

import { DisclosureButton } from "@headlessui/react";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "About", href: "/about" },
  { name: 'Insights', href: '/insights' },
  { name: "Listings", href: "/listings" },
  { name: "Coachella Valley", href: "/neighborhoods" },
  { name: "Contact", href: "/#contact" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MobileMenu({ open }: { open: boolean }) {
  const pathname = usePathname(); // Get the current pathname

  return (
    <div className={classNames(open ? "block" : "hidden", "sm:hidden")}>
      <div className="space-y-1 px-2 pb-3 pt-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                isActive
                  ? "bg-neutral-light text-gray-300"
                  : "text-neutral-light hover:bg-neutral-light/10 hover:text-gray-300",
                "block rounded-md px-3 py-2 text-base font-medium"
              )}
            >
              {item.name}
            </DisclosureButton>
          );
        })}
      </div>
    </div>
  );
}
