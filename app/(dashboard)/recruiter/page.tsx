"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function RecruiterDashboard() {
  const [applications, setApplications] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  

  // JOB MODAL STATE
  const [showJobModal, setShowJobModal] = useState(false)
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [location, setLocation] = useState("")
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [description, setDescription] = useState("")
  const [jdFile, setJdFile] = useState<File | null>(null)

  const columnStyles: any = {
    applied: "bg-blue-50 border-t-4 border-blue-500",
    shortlisted: "bg-green-50 border-t-4 border-green-500",
    interview: "bg-purple-50 border-t-4 border-purple-500",
    on_hold: "bg-yellow-50 border-t-4 border-yellow-500",
    rejected: "bg-red-50 border-t-4 border-red-500",
  }

  // AUTH
  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        if (session?.user) setUser(session.user)
        setAuthReady(true)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (session?.user) setUser(session.user)
        else setUser(null)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // FETCH
  useEffect(() => {
    if (!user || !authReady) return
    fetchJobs(user.id)
    fetchApplications(user.id)
  }, [user, authReady])

  const fetchJobs = async (uid: string) => {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("recruiter_id", uid)

    setJobs(data || [])

if (data && data.length > 0 && !selectedJobId) {
  setSelectedJobId(data[0].id)
}
    
  }

  const fetchApplications = async (uid: string) => {
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("recruiter_id", uid)

   const jobIds = (jobsData || []).map((j) => j.id)

if (jobIds.length === 0) {
  setApplications([])
  return
}

const { data: appsData } = await supabase
  .from("applications")
  .select("*")
  .in("job_id", jobIds)

const jobsMap = Object.fromEntries(
  (jobsData || []).map((j) => [j.id, j])
)

const finalApps = (appsData || []).map((app) => ({
  ...app,
  jobs: jobsMap[app.job_id],
}))

setApplications(finalApps)
  }

  // 🔥 FIXED LOCATION (IMPORTANT)
 const handlePostJob = async () => {
  if (!jobTitle || !company) {
    return alert("Title & company required")
  }

  let documentUrl = null

  // ✅ UPLOAD FILE
  if (jdFile) {
    const fileName = `jd-${Date.now()}-${jdFile.name}`

    const { error: uploadError } = await supabase.storage
      .from("job-documents")
      .upload(fileName, jdFile)

    if (uploadError) {
      console.error(uploadError)
      return alert("File upload failed")
    }

    const { data: publicUrlData } = supabase.storage
      .from("job-documents")
      .getPublicUrl(fileName)

    documentUrl = publicUrlData.publicUrl
  }

  // ✅ INSERT JOB
  const { error } = await supabase.from("jobs").insert({
    title: jobTitle,
    company,
    location,
    description,
    salary_min: salaryMin ? Number(salaryMin) : null,
    salary_max: salaryMax ? Number(salaryMax) : null,
    document_url: documentUrl, // 🔥 THIS WAS MISSING
    recruiter_id: user.id,
  })

  if (error) {
    console.error(error)
    return alert("Failed to post job")
  }

  // refresh
  fetchJobs(user.id)

  // reset
  setShowJobModal(false)
  setJobTitle("")
  setCompany("")
  setLocation("")
  setSalaryMin("")
  setSalaryMax("")
  setDescription("")
  setJdFile(null)

  alert("Job posted successfully")
}

  // DRAG
  const onDragEnd = async (result: any) => {
    if (!result.destination) return

    const id = result.draggableId
    const newStatus = result.destination.droppableId

    setApplications(prev =>
      prev.map(app =>
        String(app.id) === id ? { ...app, status: newStatus } : app
      )
    )

    await supabase
      .from("applications")
      .update({ status: newStatus })
      .eq("id", id)
  }

  // REALTIME
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("recruiter-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications" },
        () => fetchApplications(user.id)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth"
  }

  const grouped: any = {
    applied: [],
    shortlisted: [],
    interview: [],
    on_hold: [],
    rejected: [],
  }

  applications.forEach(app => {
  // 🔥 FILTER BY SELECTED JOB
  if (selectedJobId && app.job_id !== selectedJobId) return

  const s = app.status?.toLowerCase() || "applied"
  if (grouped[s]) grouped[s].push(app)
})
  if (!authReady) return <div className="p-6">Loading...</div>

  return (
    <div className="bg-gray-50 min-h-screen p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Recruiter Pipeline
          </h1>
          <p className="text-sm text-gray-500">
            Track and manage your candidates
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowJobModal(true)}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm"
          >
            + Post Job
          </button>

          <button
            onClick={handleLogout}
            className="text-red-600 text-sm hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* JOBS */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">My Jobs</h2>
        {jobs.map(job => (
          <div key={job.id} onClick={() => {
  setSelectedJobId(job.id)   // keep pipeline filtering
  setSelectedJob(job)        // open modal
}}
className={`p-4 mb-3 rounded-xl shadow-sm border cursor-pointer transition
  ${selectedJobId === job.id 
    ? "bg-black text-white" 
    : "bg-white hover:shadow-md"}
`}>
  
            {job.title}
          </div>
        ))}
      </div>

      {/* PIPELINE */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-4">

          {Object.entries(grouped).map(([status, items]: any) => (
            <Droppable key={status} droppableId={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`${columnStyles[status]} p-4 rounded-2xl shadow-sm min-h-[520px]`}
                >
                  <div className="flex justify-between mb-3">
                    <h3 className="font-semibold capitalize">
                      {status.replace("_", " ")}
                    </h3>
                    <span className="text-xs bg-white px-2 py-1 rounded-full">
                      {items.length}
                    </span>
                  </div>

                  {items.map((app: any, index: number) => (
                    <Draggable key={app.id} draggableId={String(app.id)} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setSelectedCandidate(app)}
                          className="bg-white border rounded-xl p-4 mb-3 shadow-sm hover:shadow-lg cursor-pointer"
                        >
                          <p className="font-semibold">{app.jobs?.title}</p>
                          <p className="text-sm text-gray-600">{app.candidate_name}</p>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* JOB MODAL */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h2 className="mb-4 font-semibold">Post Job</h2>

            <input placeholder="Title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full mb-2 border p-2" />
            <input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} className="w-full mb-2 border p-2" />
            <input
  placeholder="Location"
  value={location}
  onChange={(e) => setLocation(e.target.value)}
  className="w-full border p-2 mb-2"
/>

<div className="flex gap-2 mb-2">
  <input
    placeholder="Min Salary"
    value={salaryMin}
    onChange={(e) => setSalaryMin(e.target.value)}
    className="w-1/2 border p-2"
  />
  <input
    placeholder="Max Salary"
    value={salaryMax}
    onChange={(e) => setSalaryMax(e.target.value)}
    className="w-1/2 border p-2"
  />
</div>

<textarea
  placeholder="Job Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  className="w-full border p-2 mb-2"
/>
<div className="mb-3">
  <label className="text-sm text-gray-600 block mb-1">
    Or upload JD (PDF / Word)
  </label>

  <input
    type="file"
    accept=".pdf,.doc,.docx"
    onChange={(e) => setJdFile(e.target.files?.[0] || null)}
    className="w-full border p-2 rounded"
  />

  {jdFile && (
    <p className="text-xs text-gray-500 mt-1">
      Selected: {jdFile.name}
    </p>
  )}
</div>

            <div className="flex justify-between">
              <button onClick={() => setShowJobModal(false)}>Cancel</button>
              <button onClick={handlePostJob} className="bg-black text-white px-3 py-1 rounded">
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANDIDATE MODAL */}
      {selectedJob && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-xl">

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          {selectedJob.title}
        </h2>

        <button
          onClick={() => setSelectedJob(null)}
          className="text-gray-500"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-gray-700">
        {selectedJob.company}
      </p>

      <p className="text-sm text-gray-500">
        📍 {selectedJob.location}
      </p>

      <p className="text-sm text-green-700 mt-2">
        💰 {selectedJob.salary_min} - {selectedJob.salary_max}
      </p>

      {selectedJob.description && (
        <div className="mt-3 bg-gray-50 p-3 rounded">
          <p className="text-sm">
            {selectedJob.description}
          </p>
        </div>
      )}

      {selectedJob.document_url && (
        <a
          href={selectedJob.document_url}
          target="_blank"
          className="text-blue-600 underline mt-3 block"
        >
          📄 View Job Description File
        </a>
      )}
    </div>
  </div>
)}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
           <h2 className="mb-4 font-semibold text-lg">
  Candidate Profile
</h2>

<div className="space-y-2 text-sm text-gray-700">
  <p><strong>Name:</strong> {selectedCandidate.candidate_name}</p>
  <p><strong>Email:</strong> {selectedCandidate.candidate_email}</p>
  <p><strong>Phone:</strong> {selectedCandidate.candidate_phone}</p>
  <p><strong>Location:</strong> {selectedCandidate.candidate_location}</p>
</div>

<div className="mt-4 p-3 bg-gray-50 rounded">
  <p>
    <strong>Applied for:</strong> {selectedCandidate.jobs?.title}
  </p>
</div>

{selectedCandidate.resume_url && (
  <a
    href={selectedCandidate.resume_url}
    target="_blank"
    className="text-blue-600 underline mt-3 block"
  >
    📄 View Resume
  </a>
)}           <button onClick={() => setSelectedCandidate(null)}>Close</button>
          </div>
        </div>
      )}

    </div>
  )
}