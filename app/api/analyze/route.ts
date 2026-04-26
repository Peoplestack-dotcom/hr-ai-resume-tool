import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    console.log("API HIT")

    const { resumeText, role } = await req.json()

    if (!resumeText || !role) {
      return NextResponse.json(
        { error: "Missing input" },
        { status: 400 }
      )
    }

    // 🔥 Trim resume to avoid token dilution
    const trimmedResume = resumeText.slice(0, 3000)

    // 🔥 Role-specific focus
    const roleContextMap: any = {
      "HR Executive": "recruitment coordination, sourcing, ATS usage",
      "Talent Acquisition": "sourcing strategy, screening, hiring pipelines",
      "HR Generalist": "HR operations, onboarding, employee lifecycle",
    }

    const roleContext =
      roleContextMap[role] || "general HR responsibilities"

    const prompt = `
You are a sharp HR recruiter reviewing a resume.

Role: ${role}
Focus Area: ${roleContext}

Candidate level: 0–6 years
IMPORTANT: Do NOT expect leadership or senior experience.

Your job:
Give SPECIFIC feedback based ONLY on the resume.

STRICT RULES:
- Each issue must refer to something missing or weak in THIS resume
- Each suggestion must directly fix that issue
- Avoid generic advice like "improve formatting"
- Mention actual skills, tools, or gaps

OUTPUT JSON ONLY:

{
  "score": number (40-85 realistic),
  "issues": [
    "specific issue from resume",
    "specific issue from resume",
    "specific issue from resume"
  ],
  "suggestions": [
    "actionable fix for issue 1",
    "actionable fix for issue 2",
    "actionable fix for issue 3"
  ]
}

Resume:
${trimmedResume}
`

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.9, // 🔥 KEY CHANGE
        }),
      }
    )

    const data = await response.json()

    console.log("GROQ FULL RESPONSE:", data)

    let text = data?.choices?.[0]?.message?.content || ""

    // 🔥 Clean markdown if present
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    let parsed: any = null

    try {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    } catch {
      parsed = null
    }

    // 🔥 Fallback if AI fails
    if (!parsed) {
      console.log("⚠️ JSON parse failed, using fallback")

      parsed = {
        score: Math.floor(Math.random() * 20) + 55,
        issues: [
          "Resume lacks role-specific HR keywords",
          "Experience descriptions are too generic",
          "No measurable achievements mentioned",
        ],
        suggestions: [
          "Add ATS, recruitment tools, or HRMS keywords",
          "Quantify impact with numbers (e.g., hires, efficiency)",
          "Tailor resume summary to target HR role",
        ],
      }
    }

    // 🔥 Score variation (prevents same score)
    parsed.score = Math.min(
      90,
      Math.max(40, parsed.score + Math.floor(Math.random() * 10) - 5)
    )

    return NextResponse.json({
      result: JSON.stringify(parsed),
    })

  } catch (err) {
    console.error("API ERROR:", err)

    return NextResponse.json({
      result: JSON.stringify({
        score: 60,
        issues: ["Unable to analyze resume properly"],
        suggestions: ["Try again with clearer resume content"],
      }),
    })
  }
}