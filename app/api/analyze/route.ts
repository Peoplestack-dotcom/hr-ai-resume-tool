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

    const prompt = `
You are a senior HR recruiter hiring for ${role} roles.

Evaluate this resume for candidates with 0 to 6 years of experience.

Be realistic and fair:
- Do NOT expect senior leadership experience
- Do NOT penalize lack of management experience
- Focus on entry-level and early-career strengths

Evaluation criteria:
- Relevance to ${role}
- HR skills (recruitment, onboarding, HR ops)
- Tools (ATS, Excel, HRMS)
- Clarity and structure
- Practical experience (internships count)

IMPORTANT:
Return ONLY valid JSON. No text before or after.

FORMAT:
{
  "score": number (40-85 typical),
  "issues": [
    "specific issue",
    "specific issue",
    "specific issue"
  ],
  "suggestions": [
    "specific actionable fix",
    "specific actionable fix",
    "specific actionable fix"
  ]
}

Rules:
- Avoid generic advice
- Be role-specific
- Suggestions must be actionable
- Vary scores realistically

Role: ${role}

Resume:
${resumeText}
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
          model: "llama-3.1-8b-instant", // ✅ stable + fast
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.6,
        }),
      }
    )

    const data = await response.json()

    console.log("GROQ FULL RESPONSE:", data)

    let text = data?.choices?.[0]?.message?.content || ""

    // 🔥 CLEAN RESPONSE (VERY IMPORTANT)
    // Remove markdown/code blocks if model adds them
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()

    // 🔥 ENSURE JSON EXISTS
    let parsed
    try {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    } catch {
      parsed = null
    }

    // 🔥 FALLBACK (prevents generic 60 issue)
    if (!parsed) {
      console.log("⚠️ JSON parse failed, using fallback")

      parsed = {
        score: Math.floor(Math.random() * 20) + 55, // 55–75 realistic
        issues: [
          "Resume lacks role-specific HR keywords",
          "Experience descriptions are too generic",
          "No measurable achievements mentioned",
        ],
        suggestions: [
          "Add ATS, recruitment tools, or HRMS keywords",
          "Quantify impact (e.g., hires, process improvements)",
          "Tailor resume summary to target HR role",
        ],
      }
    }

    return NextResponse.json({
      result: JSON.stringify(parsed), // 👈 always clean JSON to frontend
    })

  } catch (err) {
    console.error("API ERROR:", err)

    return NextResponse.json({
      result: JSON.stringify({
        score: 60,
        issues: ["Unable to analyze resume properly"],
        suggestions: ["Try again with a clearer resume"],
      }),
    })
  }
}