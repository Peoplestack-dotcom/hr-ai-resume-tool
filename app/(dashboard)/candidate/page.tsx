"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function CandidateDashboard() {
  const [jobs, setJobs] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [appliedJobs, setAppliedJobs] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  const [activeTab, setActiveTab] = useState("jobs")
  const [jobSearch, setJobSearch] = useState("")
  const [appFilter, setAppFilter] = useState("all")

  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [candidateName, setCandidateName] = useState("")
  const [candidatePhone, setCandidatePhone] = useState("")
  const [candidateLocation, setCandidateLocation] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  // AUTH
  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        if (session?.user) setUserId(session.user.id)
        setAuthReady(true)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (session?.user) setUserId(session.user.id)
        else setUserId(null)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // FETCH
  useEffect(() => {
    if (!userId || !authReady) return
    fetchJobs()
    fetchApplications(userId)
  }, [userId, authReady])

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*")
    setJobs(data || [])
  }

  const fetchApplications = async (uid: string) => {
    const { data: appsData } = await supabase
      .from("applications")
      .select("*")
      .eq("candidate_id", uid)

    if (!appsData || appsData.length === 0) {
      setApplications([])
      setAppliedJobs([])
      return
    }

    const jobIds = appsData.map(a => a.job_id)

    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*")
      .in("id", jobIds)

    const jobsMap = Object.fromEntries(
      (jobsData || []).map((j) => [j.id, j])
    )

    const finalApps = (appsData || []).map((app) => ({
      ...app,
      jobs: jobsMap[app.job_id],
    }))

    setApplications(finalApps)
    setAppliedJobs(appsData.map(a => String(a.job_id)))
  }

  // APPLY
  const handleSubmitApplication = async () => {
    if (!userId || !selectedJob) return

    const { data: existingApps } = await supabase
      .from("applications")
      .select("*")
      .eq("candidate_id", userId)
      .limit(1)

    if (existingApps && existingApps.length > 0) {
      const existing = existingApps[0]

      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from("applications").insert({
        job_id: selectedJob.id,
        candidate_id: userId,
        candidate_name: existing.candidate_name,
        candidate_email: user?.email,
        candidate_phone: existing.candidate_phone,
        candidate_location: existing.candidate_location,
        resume_url: existing.resume_url,
        status: "applied",
      })

      if (error) return alert("Failed to apply")

      setAppliedJobs(prev => [...prev, String(selectedJob.id)])
      fetchApplications(userId)
      setSelectedJob(null)

      return alert("Applied using saved profile")
    }

    if (!candidateName || !candidatePhone || !candidateLocation) {
      return alert("Please fill all details")
    }

    if (appliedJobs.includes(String(selectedJob.id))) {
      return alert("Already applied")
    }

    let resumeUrl = ""

    if (resumeFile) {
      const filePath = `candidate-resumes/${Date.now()}_${resumeFile.name}`

      const { error: uploadError } = await supabase.storage
        .from("job-documents")
        .upload(filePath, resumeFile)

      if (uploadError) return alert("Resume upload failed")

      const { data } = supabase.storage
        .from("job-documents")
        .getPublicUrl(filePath)

      resumeUrl = data.publicUrl
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("applications").insert({
      job_id: selectedJob.id,
      candidate_id: userId,
      candidate_name: candidateName,
      candidate_email: user?.email,
      candidate_phone: candidatePhone,
      candidate_location: candidateLocation,
      resume_url: resumeUrl,
      status: "applied",
    })

    if (error) return alert("Failed to apply")

    setAppliedJobs(prev => [...prev, String(selectedJob.id)])
    fetchApplications(userId)

    setSelectedJob(null)
    setCandidateName("")
    setCandidatePhone("")
    setCandidateLocation("")
    setResumeFile(null)

    alert("Application submitted successfully")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  const filteredJobs = jobs.filter((job) =>
    job.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
    job.company?.toLowerCase().includes(jobSearch.toLowerCase())
  )

  const filteredApplications = applications.filter((app) => {
    const status = app.status?.toLowerCase()
    if (appFilter === "active") return status !== "rejected"
    if (appFilter === "rejected") return status === "rejected"
    return true
  })

  if (!authReady) return <div className="p-6">Loading...</div>

  return (
    <div className="bg-gray-100 min-h-screen p-6 text-gray-900">
      <div className="max-w-2xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Candidate Dashboard</h1>
          <button onClick={handleLogout} className="text-red-600">
            Logout
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-full border ${
              activeTab === "jobs" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Jobs
          </button>

          <button
            onClick={() => setActiveTab("applications")}
            className={`px-4 py-2 rounded-full border ${
              activeTab === "applications" ? "bg-black text-white" : "bg-white"
            }`}
          >
            My Applications
          </button>
        </div>

        {/* JOBS */}
        {activeTab === "jobs" && (
          <>
            <input
              placeholder="Search jobs..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="w-full mb-4 border p-3 rounded-lg bg-white"
            />

            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white p-4 mb-4 rounded-xl shadow">

                <h2 className="font-semibold text-lg">{job.title}</h2>
                <p className="text-sm text-gray-600">{job.company}</p>

                {job.location && (
                  <p className="text-sm text-gray-500 mt-1">📍 {job.location}</p>
                )}

                {(job.salary_min || job.salary_max) && (
                  <p className="text-sm text-green-600 mt-1">
                    💰 {job.salary_min} - {job.salary_max}
                  </p>
                )}

                {job.description && (
                  <div className="bg-gray-100 p-2 mt-3 rounded text-sm">
                    {job.description}
                  </div>
                )}

                {job.document_url && (
                  <a href={job.document_url} target="_blank" className="text-blue-600 underline text-sm mt-2 block">
                    📄 View Job Description File
                  </a>
                )}

                {appliedJobs.includes(String(job.id)) ? (
                  <button className="bg-gray-400 text-white mt-3 px-4 py-1 rounded-full">
                    Applied
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="bg-blue-600 text-white mt-3 px-4 py-1 rounded-full"
                  >
                    Apply
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {/* APPLICATIONS */}
        {activeTab === "applications" && (
          <>
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="border p-2 rounded mb-4"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
            </select>

            {filteredApplications.map((app) => (
              <div key={app.id} className="bg-white p-4 mb-4 rounded-xl shadow">
                <h2>{app.jobs?.title}</h2>
                <p>{app.jobs?.company}</p>
                <p>Status: {app.status}</p>
              </div>
            ))}
          </>
        )}

        {/* MODAL */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-xl w-full max-w-md">
              <h2>Apply for {selectedJob.title}</h2>

              <input placeholder="Name" onChange={(e)=>setCandidateName(e.target.value)} className="border p-2 w-full mb-2"/>
              <input placeholder="Phone" onChange={(e)=>setCandidatePhone(e.target.value)} className="border p-2 w-full mb-2"/>
              <input placeholder="Location" onChange={(e)=>setCandidateLocation(e.target.value)} className="border p-2 w-full mb-2"/>

              <button onClick={handleSubmitApplication} className="bg-blue-600 text-white px-4 py-2 rounded">
                Submit
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}