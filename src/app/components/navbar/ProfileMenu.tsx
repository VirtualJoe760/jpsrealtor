"use client";

import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function ProfileMenu() {
  const { data: session } = useSession(); // Get session data

  // If no session, don't render the menu
  if (!session) return null;

  const userName = session.user?.name || "Guest";

  // Generate initials (e.g., "JS" for John Smith)
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
      {/* Notifications Button */}
      <button
        type="button"
        className="rounded-full bg-neutral-dark p-1 text-neutral-light hover:text-neutral-dark focus:outline-none focus:ring-2 focus:ring-neutral-light"
      >
        <span className="sr-only">View notifications</span>
        <svg
          className="h-6 w-6"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          {/* Bell Icon */}
        </svg>
      </button>

      {/* Profile Menu */}
      <Menu as="div" className="relative ml-3">
        <MenuButton className="flex rounded-full bg-neutral-light text-sm focus:outline-none focus:ring-2 focus:ring-neutral-dark">
          <span className="sr-only">Open user menu</span>
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt={`${userName}'s profile`}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-500 text-white font-bold">
              {initials}
            </div>
          )}
        </MenuButton>
        <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-neutral-light py-1 shadow-lg ring-1 ring-black/5">
          <ProfileMenuItem name="Your Profile" href="#profile" />
          <ProfileMenuItem name="Settings" href="#settings" />
          <ProfileMenuItem name="Sign Out" href="/api/auth/signout" />
        </MenuItems>
      </Menu>
    </div>
  );
}

function ProfileMenuItem({ name, href }: { name: string; href: string }) {
  return (
    <MenuItem>
      {({ active }) => (
        <Link
          href={href}
          className={classNames(
            active
              ? "bg-neutral-dark/10 text-neutral-dark"
              : "text-neutral-dark",
            "block px-4 py-2 text-sm"
          )}
        >
          {name}
        </Link>
      )}
    </MenuItem>
  );
}
