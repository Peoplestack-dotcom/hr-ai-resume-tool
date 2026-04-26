"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div>
      <div className="bg-black text-white p-4 flex justify-between">
        <h1>ATS v2</h1>
        <button onClick={handleLogout} className="bg-red-500 px-3 py-1">
          Logout
        </button>
      </div>

      <div className="p-6">{children}</div>
    </div>
  )
}