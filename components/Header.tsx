"use client";

import Image from "next/image";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-blue-900 text-white flex items-center justify-between px-4 py-3 shadow-md">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Logo"
          width={36}
          height={36}
          className="rounded-md"
        />
        <span className="font-bold text-lg">AAP – Move-Athon-Mania</span>
      </div>

      {/* Right: Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-white overflow-hidden">
        <Image
          src="/default-avatar.png"
          alt="User"
          width={40}
          height={40}
        />
      </div>
    </header>
  );
}
