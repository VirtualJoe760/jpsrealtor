"use client";

import Link from "next/link";

export default function Logo() {
  return (
    <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
      <div className="flex-shrink-0">
        <Link href="/">
          <h1 className="text-3xl cursor-pointer">JPS</h1>
        </Link>
      </div>
    </div>
  );
}