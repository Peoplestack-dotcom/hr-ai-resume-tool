"use client"

import { useEffect, useState } from "react"
import JobList from "./JobList"
import { supabase } from "@/lib/supabaseClient"

export default function Home() {
  const [jobs, setJobs] = useState<any[]>([])

  const [showAIModal, setShowAIModal] = useState(false)
  const [resumeText, setResumeText] = useState("")
  const [analysisDone, setAnalysisDone] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [score, setScore] = useState<number | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])

  const [selectedRole, setSelectedRole] = useState("HR Executive")

  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)

  const [feedbackGiven, setFeedbackGiven] = useState<"helpful" | "not_helpful" | null>(null)

  // 🔥 ANALYZE
  const handleAnalyze = async () => {
    if (!resumeText) return alert("Paste resume text")

    setIsAnalyzing(true)

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          role: selectedRole,
        }),
      })

      const data = await res.json()
      console.log("RAW AI RESPONSE:", data.result)

      let parsed: any = {}

      try {
        const match = data.result.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
      } catch {}

      setScore(parsed.score ?? 60)
      setIssues(parsed.issues ?? ["Resume needs improvement"])
      setSuggestions(parsed.suggestions ?? [])

      setAnalysisDone(true)
      setIsAnalyzing(false)
    } catch (err) {
      console.error(err)
      setIsAnalyzing(false)
    }
  }

  // 🔥 SAVE FEEDBACK
  const saveFeedback = async (type: string, emailInput?: string) => {
    if (type !== "email_capture" && feedbackGiven) return

    const { error } = await supabase.from("user_feedback").insert([
      {
        feedback: type,
        email: emailInput || null,
        role: selectedRole,
        score: score,
      },
    ])

    if (error) {
      console.error("Error saving:", error)
      alert("Something went wrong")
    } else {
      if (type === "email_capture") {
        setEmailSent(true)
      } else {
        setFeedbackGiven(type as any)
      }
    }
  }

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase.from("jobs").select("*")
      setJobs(data || [])
    }
    fetchJobs()
  }, [])

  const safeScore = score ?? 0

  const potentialScore =
    score !== null
      ? score < 60
        ? score + 25
        : score < 75
        ? score + 15
        : score + 8
      : null

  return (
    <div className="bg-gray-100 min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-end gap-4 mb-6">
          <button
            onClick={() => setShowAIModal(true)}
            className="bg-black text-white px-4 py-1 rounded"
          >
            ⚡ Analyze Resume
          </button>
          <a href="/auth" className="text-blue-600 text-sm">
            Login
          </a>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Find HR Jobs</h1>
        </div>

        <JobList jobs={jobs} />
      </div>

      {/* MODAL */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg max-h-[85vh] overflow-y-auto">

            {/* HEADER */}
            <div className="flex justify-between p-4 border-b">
              <h2>Resume Analysis</h2>
              <button
                onClick={() => {
                  setShowAIModal(false)
                  setAnalysisDone(false)
                  setResumeText("")
                  setEmail("")
                  setEmailSent(false)
                  setFeedbackGiven(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">

              {!analysisDone && !isAnalyzing && (
                <>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option>HR Executive</option>
                    <option>Talent Acquisition</option>
                    <option>HR Generalist</option>
                  </select>

                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste resume..."
                    className="w-full border p-2 rounded"
                  />

                  <button
                    onClick={handleAnalyze}
                    className="bg-black text-white w-full py-2 rounded"
                  >
                    Analyze
                  </button>
                </>
              )}

              {isAnalyzing && (
                <div className="text-center py-6">
                  <div className="animate-spin h-8 w-8 border-b-2 border-black mx-auto"></div>
                  <p className="text-sm mt-2">Analyzing...</p>
                </div>
              )}

              {analysisDone && (
                <div className="space-y-3">

                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => saveFeedback("helpful")}
                      disabled={!!feedbackGiven}
                      className={`px-2 py-1 rounded ${
                        feedbackGiven === "helpful"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100"
                      }`}
                    >
                      👍 Helpful
                    </button>

                    <button
                      onClick={() => saveFeedback("not_helpful")}
                      disabled={!!feedbackGiven}
                      className={`px-2 py-1 rounded ${
                        feedbackGiven === "not_helpful"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100"
                      }`}
                    >
                      👎 Not Helpful
                    </button>
                  </div>

                  {feedbackGiven && (
                    <p className="text-xs text-gray-500">
                      Thanks for your feedback 🙌
                    </p>
                  )}

                  <div className="p-3 border rounded bg-gray-50">
                    <p className="text-xs">Based on {selectedRole}</p>
                    <p
                      className={`text-3xl font-bold ${
                        safeScore < 60
                          ? "text-red-600"
                          : safeScore < 75
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {safeScore}/100
                    </p>
                    <p className="text-xs">
                      Improve to ~{potentialScore}
                    </p>
                  </div>

                  {issues.map((i, idx) => (
                    <div key={idx} className="bg-red-50 p-2 rounded text-sm">
                      ❌ {i}
                    </div>
                  ))}

                  <div className="blur-sm">
                    {suggestions.map((s, i) => (
                      <div key={i} className="bg-gray-100 p-2 rounded text-sm">
                        {s}
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>

            {analysisDone && (
              <div className="sticky bottom-0 bg-white border-t p-3 space-y-2">

                <button className="bg-black text-white w-full py-2 rounded">
                  Unlock Full Report – ₹199
                </button>

                <p className="text-xs text-gray-500">
                  Get full report on email
                </p>

                <div className="flex gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 border p-2 rounded text-sm"
                    placeholder="Enter your email"
                  />

                  <button
                    onClick={() => {
                      if (!email) return alert("Enter email")
                      saveFeedback("email_capture", email)
                    }}
                    className="bg-blue-600 text-white px-3 rounded text-sm"
                  >
                    Send
                  </button>
                </div>

                {emailSent && (
                  <p className="text-green-600 text-xs">
                    ✅ Email saved successfully
                  </p>
                )}

              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}