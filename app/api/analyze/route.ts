console.log("API HIT")
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { resumeText, role } = await req.json()

  const prompt = `
You are a senior HR recruiter hiring for ${role} roles.

Evaluate this resume for candidates with 0 to 6 years of experience.

Be realistic and fair:
- Do NOT expect senior leadership experience
- Do NOT penalize lack of management experience
- Focus on entry-level and early-career strengths

Evaluate based on:
- Relevance to ${role}
- HR skills (recruitment, onboarding, HR ops, etc.)
- Tools (ATS, Excel, HRMS)
- Clarity and structure
- Practical experience (internships count)

Return ONLY valid JSON:

{
  "score": number (0-100),
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
- Be specific to HR roles
- Avoid generic advice
- Suggestions must be actionable
- Score should realistically vary (40–85 range typical)

Role: ${role}

Resume:
${resumeText}
`

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    })


   const data = await response.json()

console.log("GROQ FULL RESPONSE:", data) // 👈 ADD THIS

    const text = data.choices?.[0]?.message?.content || "{}"

    return NextResponse.json({ result: text })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "AI failed" }, { status: 500 })
  }
}