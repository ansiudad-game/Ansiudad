import 'groq-sdk/shims/web'
import { Groq } from "groq-sdk"

const DEFAULT_MODEL = "openai/gpt-oss-120b"

function getGroqClient(env) {
    const apiKey = env.GROQ_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('GROQ_API_KEY is missing.')
    }

    return new Groq({ apiKey, timeout: 60000, maxRetries: 0 })
}

function createChatCompletion(groq, messages, model, temperature) {
    const payload = {
        messages,
        model,
        temperature,
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
            content: `Eres quien redacta las cartas del juego de mesa Ansiudad, una metrópolis ficticia con problemas socioambientales.
Escribe en español, con el tono de una noticia breve: directo y accesible, con un poco de humor satírico y un toque fantasioso, sin burlarte de grupos vulnerables.
Parte de situaciones que sí podrían suceder en una ciudad: plagas, contaminación, fallas de infraestructura, escasez de agua, conflictos de transporte o tecnologías mal implementadas.
El toque fantasioso debe ser ligero: una coincidencia insólita, una mutacion extraordinaria, una exageración periodística, un nombre divertido o una medida burocrática absurda. Usa como máximo un detalle de este tipo por evento.
Las causas y consecuencias deben ser físicamente plausibles. Los animales pueden adaptarse o resistir controles. Los robots e inventos deben tener funciones tecnológicas verosímiles. Evita magia y objetos con voluntad propia.
El humor surge de contradicciones urbanas y decisiones humanas. Por ejemplo, una campaña de limpieza que genera más basura o una fábrica de patitos de hule que contamina el agua.
Antes de responder, comprueba que cada noticia podría ocurrir sin fenómenos sobrenaturales y que el detalle insólito no desplaza el problema socioambiental.
Cada evento es autónomo y plantea un conflicto que el equipo debe resolver. No des la solución ni impongas una única respuesta correcta.
Responde SOLO con JSON válido, sin markdown y sin texto extra.
El objeto debe tener exactamente esta forma:
{"events":[{"title":"string","description":"string","type":"string"}]}
No cambies los nombres de las llaves.
Límites de longitud (obligatorios, para que quepa en una carta):
- title: categoría socioambiental de máximo 3 palabras, como "Manejo de desechos", "Movilidad y transporte" o "Crisis hídrica"
- description: máximo 25 palabras en total, en una o dos frases cortas; usa palabras sencillas y evita detalles secundarios para que el texto quepa completo en la carta
- type: una sola palabra
Ejemplos de estilo y estructura:
{"events":[{"title":"Manejo de desechos","description":"Las ratas del vertedero de Ansiudad resisten los raticidas habituales. Vecinos las apodan las invencibles mientras la basura sigue acumulándose.","type":"residuos"},{"title":"Movilidad y transporte","description":"Una tuneladora apodada el monstruo del subsuelo daña una línea del metro de Ansiudad durante las obras de ampliación. Miles de usuarios quedan sin servicio.","type":"movilidad"},{"title":"Crisis hídrica","description":"Explosión en la fábrica de patitos de hule de Ansiudad provoca la filtración de residuos contaminantes en un pozo que abastece a varios barrios.","type":"agua"}]}`,
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
- name: máximo 4 palabras
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

async function completeJson(groq, messages, model, temperature) {
    const response = await createChatCompletion(groq, messages, model, temperature)
    const text = getMessageText(response)
    try {
        return cleanJsonResponse(text)
    } catch (error) {
        console.error("Raw model response (truncated):", String(text).slice(0, 800))
        throw error
    }
}

export async function generateGame(body, env) {
    const { prompt, _numberOfTeams, _numberOfRoles } = body ?? {};
    const validCount = (value, max) =>
        (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) &&
        Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= max;
    if (!validCount(_numberOfTeams, 5) || !validCount(_numberOfRoles, 25) ||
        (prompt !== undefined && (typeof prompt !== 'string' || prompt.length > 2000))) {
        return { status: 400, body: { success: false, error: 'Use 1-5 teams, 1-25 roles and a theme of up to 2000 characters.' } };
    }
    const theme = prompt?.trim() || 'Elige un tema socioambiental aleatorio, relevante para una metrópolis moderna llamada Ansiudad';
    try {
        const groq = getGroqClient(env);
        const model = env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
        const [events, roles] = await Promise.all([
            completeJson(groq, buildEventPrompt(theme, Number(_numberOfTeams)), model, 0.6),
            completeJson(groq, buildRolePrompt(theme, Number(_numberOfRoles)), model, 0.3),
        ]);
        return { status: 200, body: { success: true, data: { events, roles } } };
    } catch (error) {
        console.error('Game generation failed:', error?.status ?? error?.name);
        return { status: 502, body: { success: false, error: 'No se pudo generar la partida. Intenta de nuevo más tarde.' } };
    }
}
