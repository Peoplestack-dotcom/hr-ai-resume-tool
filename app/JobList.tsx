"use client"

import { useState } from "react"

export default function JobList({ jobs }: { jobs: any[] }) {
  const [search, setSearch] = useState("")

  const filteredJobs = jobs.filter((job) =>
    job.title?.toLowerCase().includes(search.toLowerCase()) ||
    job.company?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* 🔍 SEARCH BAR */}
      <input
        placeholder="Search jobs or company..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-6 border p-3 rounded-lg bg-white text-black"
      />

      {/* JOB LIST */}
      {filteredJobs.length === 0 ? (
        <p className="text-center text-gray-500">
          No matching jobs found.
        </p>
      ) : (
        filteredJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white border rounded-xl p-5 mb-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {job.title}
            </h2>

            <p className="text-sm text-gray-700">
              {job.company}
            </p>

            <p className="text-sm text-gray-500">
              📍 {job.location}
            </p>

            <p className="text-sm text-green-700 mt-2">
              💰 {job.salary_min} - {job.salary_max}
            </p>

           <div className="mt-3 bg-gray-50 p-3 rounded">
  <p className="text-sm text-gray-800">
    {job.description}
  </p>

  {/* 📄 JD FILE LINK */}
  {job.document_url && (
    <a
      href={job.document_url}
      target="_blank"
      className="text-blue-600 underline text-sm mt-2 block"
    >
      📄 View Job Description File
    </a>
  )}
</div>

            <a
              href="/auth"
              className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Apply
            </a>
          </div>
        ))
      )}
    </>
  )
}