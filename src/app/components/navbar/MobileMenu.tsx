"use client";

import { DisclosureButton } from "@headlessui/react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const navigation = [
  { name: "About", href: "/about" },
  { name: "Insights", href: "/insights" },
  { name: "Listings", href: "/mls-listings" },
  { name: "Coachella Valley", href: "/neighborhoods" },
  { name: "Contact", href: "/#contact" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={classNames(
        open ? "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" : "hidden",
        "sm:hidden"
      )}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
        aria-label="Close menu"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Menu Items */}
      <div className="space-y-1 px-4 pt-20 pb-5 z-50">
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
                  ? "bg-white/10 text-white"
                  : "text-white hover:bg-white/10",
                "block rounded-md px-3 py-2 text-lg font-medium"
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
