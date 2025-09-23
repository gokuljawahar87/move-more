// File: app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Always send users to /app
  redirect("/app");
}
