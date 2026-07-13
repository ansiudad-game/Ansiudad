import { Groq } from "groq-sdk"

function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('GROQ_API_KEY is missing. Add it to your .env file and restart the dev server.')
    }

    return new Groq({ apiKey })
}

function cleanJsonResponse(str) {
    try {
        const cleanStr = str.replace(/```(json)?\n?/g, "").replace(/\n```$/, "")
        return JSON.parse(cleanStr)
    } catch (e) {
        try {
            const fixedStr = str.replace(/'/g, '"')
            return JSON.parse(fixedStr)
        } catch (e2) {
            try {
                const cleanedStr = str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
                return JSON.parse(cleanedStr)
            } catch (e3) {
                throw new Error("Unable to parse JSON string: " + e3.message)
            }
        }
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, _numberOfTeams, _numberOfRoles } = req.body ?? {};
    const themePrompt = (typeof prompt === 'string' && prompt.trim())
        ? prompt.trim()
        : 'Elige un tema socioambiental aleatorio relevante para una metrópolis moderna llamada Ansiudad.';

    if (!_numberOfTeams || !_numberOfRoles) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    const guideline = "Solo entrega el objeto en formato JSON, omite cualquier otro texto o introduccion"
    const guideline2 = "No cambies los nombres de las llaves, tienen que estar como en el siquiente ejemplo para poder extraerlas con JSON"
    const guideline3 = "Recuerda generar roles realisticos de perfiles de habitantes de una metropolis moderna, de diversos ambitos y contextos"

    const eventPrompt = [
        {
            role: "system",
            content: `Eres el narrador de un juego de mesa llamado Ansiudad. Genera ${_numberOfTeams} eventos basados en el tema que proporcione el usuario. ${guideline2}, recuerda usar un poco de humor satirico, y un poco fantasioso.
Genera ${_numberOfTeams} eventos basados en el tema que proporcione a continuacion el usuario.
Formatea la respuesta como un objeto JSON con estos campos para cada evento. ${guideline}:
- title: string (título corto del evento)
- description: string (descripción breve con un toque de humor y fantasía)
- type: string (categoría del evento)
Formato y narrativas de ejemplo:
{
  "events": [
    {
      "title": "Manejo de desechos",
      "description": "Los altos niveles de toxicidad en el vertedero de Ansiudad han dotado a las ratas de súper fuerza y resistencia a los raticidas."
    }
  ]
}`
        },
        {
            role: "user",
            content: themePrompt
        }
    ]

    const rolePrompt = [
        {
            role: "system",
            content: `Eres el narrador de Ansiudad. Genera roles ${_numberOfRoles} de personajes basados en los siguientes lineamientos: ${guideline3}.
Genera ${_numberOfRoles} roles. ${guideline2}
Formatea la respuesta como un objeto JSON con estos campos para cada rol. ${guideline}:
- name: string (título del rol)
- priorities: string (principales preocupaciones y objetivos)
- interests: string (lo que les importa)
Formato y narrativas de ejemplo:
{
  "roles": [
    {
      "name": "Mujeres",
      "priorities": "Tu prioridad es alcanzar la igualdad de género, con acceso a servicios de salud reproductiva, seguridad en espacios públicos, y oportunidades laborales y educativas equitativas."
    }
  ]
}`
        },
        {
            role: "user",
            content: themePrompt
        }
    ]

    try {
        const groq = getGroqClient()
        const eventResponse = await groq.chat.completions.create({
            messages: eventPrompt,
            model: "llama-3.3-70b-versatile",
            temperature: 0.9,
        })
        const roleResponse = await groq.chat.completions.create({
            messages: rolePrompt,
            model: "llama-3.3-70b-versatile",
            temperature: 0.9,
        })

        const parsedEventResponse = cleanJsonResponse(eventResponse.choices[0].message.content)
        const parsedRoleResponse = cleanJsonResponse(roleResponse.choices[0].message.content)

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
