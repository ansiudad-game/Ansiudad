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
    return groq.chat.completions.create({
        messages,
        model: GROQ_MODEL,
        temperature: 0.9,
        reasoning_effort: "low",
        reasoning_format: "parsed",
        max_completion_tokens: 4096,
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

function cleanJsonResponse(str) {
    if (!str || !str.trim()) {
        throw new Error("Empty model response")
    }

    const cleanStr = str.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
    const candidates = [cleanStr]

    const start = cleanStr.indexOf("{")
    const end = cleanStr.lastIndexOf("}")
    if (start !== -1 && end > start) {
        candidates.push(cleanStr.slice(start, end + 1))
    }

    let lastError
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate)
        } catch (error) {
            lastError = error
            try {
                return JSON.parse(candidate.replace(/'/g, '"'))
            } catch (quotedError) {
                lastError = quotedError
            }
        }
    }

    throw new Error("Unable to parse JSON string: " + (lastError?.message ?? "unknown error"))
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
Ejemplo:
{"roles":[{"name":"Mujeres","priorities":"Tu prioridad es alcanzar la igualdad de género, con acceso a servicios de salud reproductiva, seguridad en espacios públicos, y oportunidades laborales y educativas equitativas.","interests":"Salud, seguridad y oportunidades equitativas."}]}`,
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
    return cleanJsonResponse(getMessageText(response))
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
