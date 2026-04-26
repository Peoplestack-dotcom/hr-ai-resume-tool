"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("candidate")
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      alert("Enter email & password")
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      await redirectUser()
    } else {
     const { data, error } = await supabase.auth.signUp({
  email,
  password,
})

if (error) {
  alert(error.message)
  return
}

// 🔥 CRITICAL FIX
if (!data?.user) {
  alert("Signup failed. Please try again.")
  return
}

await supabase.from("profiles").insert([
  {
    id: data.user.id,
    email,
    role,
  },
])
      alert("Signup successful. Please login.")
      setIsLogin(true)
    }

    setLoading(false)
  }

  const redirectUser = async () => {
    const { data } = await supabase.auth.getUser()

    if (!data.user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    if (profile?.role === "recruiter") {
      window.location.href = "/recruiter"
    } else {
      window.location.href = "/candidate"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow">

        <h2 className="text-xl mb-4 text-center font-semibold">
          {isLogin ? "Login" : "Sign Up"}
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-4 rounded"
          onChange={(e) => setPassword(e.target.value)}
        />

        {!isLogin && (
          <select
            className="w-full border p-2 mb-4 rounded"
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
          </select>
        )}

        <button
          onClick={handleAuth}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
        </button>

        <p className="text-sm mt-4 text-center">
          {isLogin ? "New user?" : "Already have an account?"}
          <span
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 ml-1 cursor-pointer"
          >
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </p>

      </div>

    </div>
  )
}