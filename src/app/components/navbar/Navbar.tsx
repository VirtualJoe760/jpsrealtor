"use client";

import { Disclosure } from "@headlessui/react";
import MobileMenuButton from "./MobileMenuButton";
import Logo from "./Logo";
import DesktopMenu from "./DesktopMenu";
import ProfileMenu from "./ProfileMenu";
import MobileMenu from "./MobileMenu";

export default function Navbar() {
  return (
    <Disclosure as="nav" className="bg-neutral-dark text-neutral-light">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <MobileMenuButton open={open} />
              <Logo />
              <DesktopMenu />
              <ProfileMenu />
            </div>
          </div>
          {/* No need to pass `open` here */}
          <MobileMenu />
        </>
      )}
    </Disclosure>
  );
}
