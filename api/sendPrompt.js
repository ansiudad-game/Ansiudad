import { Groq } from "groq-sdk"

const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b"

function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('GROQ_API_KEY is missing. Add it to your .env file and restart the dev server.')
    }

    return new Groq({ apiKey })
}

function createChatCompletion(groq, messages) {
    const payload = {
        messages,
        model: GROQ_MODEL,
        temperature: 0.9,
        reasoning_effort: "low",
        reasoning_format: "parsed",
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
    }

    return groq.chat.completions.create(payload).catch((error) => {
        const message = String(error?.message ?? "")
        if (!/response_format|json_object|json mode/i.test(message)) {
            throw error
        }

        const withoutJsonMode = { ...payload }
        delete withoutJsonMode.response_format
        return groq.chat.completions.create(withoutJsonMode)
    })
}

function getMessageText(response) {
    const message = response?.choices?.[0]?.message
    if (!message) return ""

    if (typeof message.content === "string" && message.content.trim()) {
        return message.content
    }

    if (Array.isArray(message.content)) {
        return message.content.map((part) => part?.text ?? "").join("")
    }

    return ""
}

function extractBalancedJson(str, fromIndex = 0) {
    const start = str.indexOf("{", fromIndex)
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < str.length; i += 1) {
        const char = str[i]

        if (inString) {
            if (escaped) {
                escaped = false
                continue
            }
            if (char === "\\") {
                escaped = true
                continue
            }
            if (char === "\"") inString = false
            continue
        }

        if (char === "\"") {
            inString = true
            continue
        }
        if (char === "{") depth += 1
        if (char === "}") {
            depth -= 1
            if (depth === 0) {
                return { json: str.slice(start, i + 1), end: i }
            }
        }
    }

    return null
}

function tryParseJson(candidate) {
    const variants = [
        candidate,
        candidate.replace(/,\s*([}\]])/g, "$1"),
        candidate.replace(/'/g, "\""),
    ]

    for (const variant of variants) {
        try {
            return JSON.parse(variant)
        } catch {
            // try next variant
        }
    }

    return null
}

function isGamePayload(parsed) {
    return Boolean(parsed && typeof parsed === "object" && (parsed.events || parsed.roles))
}

function cleanJsonResponse(str) {
    if (!str || !str.trim()) {
        throw new Error("Empty model response")
    }

    const cleanStr = str
        .replace(/^\uFEFF/, "")
        .replace(/```(?:json)?/gi, "")
        .replace(/```/g, "")
        .trim()

    const parsedWhole = tryParseJson(cleanStr)
    if (isGamePayload(parsedWhole)) return parsedWhole

    let lastError = null
    let cursor = 0

    while (cursor < cleanStr.length) {
        const extracted = extractBalancedJson(cleanStr, cursor)
        if (!extracted) break

        const parsed = tryParseJson(extracted.json)
        if (parsed) {
            if (isGamePayload(parsed)) return parsed
            lastError = new Error("JSON object missing events/roles")
        } else {
            lastError = new Error("Invalid JSON object")
        }

        cursor = extracted.end + 1
    }

    if (parsedWhole) return parsedWhole

    throw new Error(
        "Unable to parse JSON string: " +
        (lastError?.message ?? "no JSON object found")
    )
}

function buildEventPrompt(theme, numberOfTeams) {
    return [
        {
            role: "system",
            content: `Eres el narrador de un juego de mesa llamado Ansiudad.
Usa humor satírico y un toque fantasioso.
Responde SOLO con JSON válido, sin markdown y sin texto extra.
El objeto debe tener exactamente esta forma:
{"events":[{"title":"string","description":"string","type":"string"}]}
No cambies los nombres de las llaves.
Límites de longitud (obligatorios, para que quepa en una carta):
- title: máximo 6 palabras
- description: máximo 28 palabras, en una o dos frases cortas
- type: una sola palabra
Ejemplo:
{"events":[{"title":"Manejo de desechos","description":"Los altos niveles de toxicidad en el vertedero de Ansiudad han dotado a las ratas de súper fuerza y resistencia a los raticidas.","type":"residuos"}]}`,
        },
        {
            role: "user",
            content: `Genera exactamente ${numberOfTeams} eventos de juego para Ansiudad.
Tema: ${theme}
Devuelve únicamente el JSON con la clave "events".`,
        },
    ]
}

function buildRolePrompt(theme, numberOfRoles) {
    return [
        {
            role: "system",
            content: `Eres el narrador de Ansiudad.
Genera roles realistas de habitantes de una metrópolis moderna, de diversos ámbitos y contextos.
Responde SOLO con JSON válido, sin markdown y sin texto extra.
El objeto debe tener exactamente esta forma:
{"roles":[{"name":"string","priorities":"string","interests":"string"}]}
No cambies los nombres de las llaves.
Límites de longitud (obligatorios, para que quepa en una carta):
- name: máximo 6 palabras
- priorities: máximo 28 palabras, en una o dos frases cortas
- interests: máximo 10 palabras
Ejemplo:
{"roles":[{"name":"Mujeres","priorities":"Tu prioridad es alcanzar la igualdad de género, con acceso a salud reproductiva, seguridad en espacios públicos y oportunidades laborales equitativas.","interests":"Salud, seguridad y equidad."}]}`,
        },
        {
            role: "user",
            content: `Genera exactamente ${numberOfRoles} roles de personajes para Ansiudad.
Tema: ${theme}
Devuelve únicamente el JSON con la clave "roles".`,
        },
    ]
}

async function completeJson(groq, messages) {
    const response = await createChatCompletion(groq, messages)
    const text = getMessageText(response)
    try {
        return cleanJsonResponse(text)
    } catch (error) {
        console.error("Raw model response (truncated):", String(text).slice(0, 800))
        throw error
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, _numberOfTeams, _numberOfRoles } = req.body ?? {};
    const themePrompt = (typeof prompt === 'string' && prompt.trim())
        ? prompt.trim()
        : 'Elige un tema socioambiental aleatorio, relevante para una metrópolis moderna llamada Ansiudad';

    if (!_numberOfTeams || !_numberOfRoles) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    try {
        const groq = getGroqClient()
        const [parsedEventResponse, parsedRoleResponse] = await Promise.all([
            completeJson(groq, buildEventPrompt(themePrompt, _numberOfTeams)),
            completeJson(groq, buildRolePrompt(themePrompt, _numberOfRoles)),
        ])

        return res.status(200).json({
            success: true,
            data: {
                events: parsedEventResponse,
                roles: parsedRoleResponse,
            },
        })
    } catch (error) {
        console.error("Error in sendPromptToGroq:", error)
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
}
