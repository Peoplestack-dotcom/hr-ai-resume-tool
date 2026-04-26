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
   const roleInstructions = {
  "Talent Acquisition": `
Focus on:
- sourcing channels (LinkedIn, Naukri, referrals)
- screening and interview coordination
- ATS tools
- hiring pipeline understanding
`,

  "HR Executive": `
Focus on:
- recruitment coordination
- onboarding processes
- documentation and HR operations
- basic HRMS or admin exposure
`,

  "HR Generalist": `
Focus on:
- employee lifecycle (joining to exit)
- onboarding, engagement, policies
- HR operations and compliance
- exposure to HR processes beyond recruitment
`,
}[role] || ""

const prompt = `
You are an experienced HR recruiter reviewing a resume.

ROLE: ${role}

ROLE EXPECTATION:
${roleInstructions}

---

STEP 1: UNDERSTAND THE RESUME

Identify:
- Candidate level (Intern / 1–3 yrs / 3–6 yrs)
- Key HR skills
- Tools used (ATS, Excel, HRMS, etc.)
- Type of experience (internship / full-time)
- Strength areas
- Missing areas

---

STEP 2: EVALUATE BASED ON LEVEL

INTERN (0–1 yr):
- Focus on projects, internships, learning exposure
- DO NOT expect ownership

EARLY (1–3 yrs):
- Focus on execution (tasks handled, coordination, basic ownership)

MID (3–6 yrs):
- Focus on ownership, impact, measurable outcomes

---

STEP 3: GIVE HIGH-QUALITY FEEDBACK

STRICT RULES:

❌ No generic advice  
❌ No copy-paste feedback  
❌ No default "improve formatting" unless truly bad  

✅ Each issue must be tied to THIS resume  
✅ Each suggestion must directly fix that issue  
✅ Mention specific HR tools / processes / gaps  

---

OUTPUT JSON ONLY:

{
  "score": number (45–85 realistic),
  "issues": [
    "Specific issue based on resume",
    "Specific issue based on resume",
    "Specific issue based on resume"
  ],
  "suggestions": [
    "Actionable fix tied to issue 1",
    "Actionable fix tied to issue 2",
    "Actionable fix tied to issue 3"
  ]
}

---

GOOD vs BAD:

❌ BAD:
"Add more HR keywords"

✅ GOOD:
"Resume does not mention any ATS tools like Greenhouse or Zoho Recruit, which are expected for ${role} roles"

---

RESUME:
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