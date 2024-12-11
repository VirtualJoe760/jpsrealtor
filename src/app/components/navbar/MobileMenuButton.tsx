"use client";

import { DisclosureButton } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function MobileMenuButton({ open }: { open: boolean }) {
  return (
    <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
      <DisclosureButton className="inline-flex items-center justify-center rounded-md p-2 text-neutral-light hover:bg-neutral-light/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-light">
        <span className="sr-only">Open main menu</span>
        {open ? (
          <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
        ) : (
          <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
        )}
      </DisclosureButton>
    </div>
  );
}
