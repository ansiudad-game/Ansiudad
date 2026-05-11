import { dirname, join, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { defineConfig, loadEnv } from 'vite'
import restart from 'vite-plugin-restart'
import glsl from 'vite-plugin-glsl'

const projectRoot = dirname(fileURLToPath(import.meta.url))

/** Vercel-style helpers so api/sendPrompt.js can run under Vite dev (Connect). */
function patchNodeResponseForVercelStyleApi(res) {
    res.status = function status(code) {
        this.statusCode = code
        return this
    }
    res.json = function json(data) {
        if (!this.headersSent) {
            this.setHeader('Content-Type', 'application/json')
        }
        this.end(JSON.stringify(data))
    }
}

function sendPromptApiDev(rootDir) {
    return {
        name: 'send-prompt-api-dev',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const pathname = req.url?.split('?')[0] ?? ''
                if (pathname !== '/api/sendPrompt') {
                    return next()
                }

                patchNodeResponseForVercelStyleApi(res)

                if (req.method === 'POST') {
                    try {
                        const chunks = []
                        for await (const chunk of req) {
                            chunks.push(chunk)
                        }
                        const raw = Buffer.concat(chunks).toString('utf8')
                        req.body = raw ? JSON.parse(raw) : {}
                    } catch {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid JSON body',
                        })
                    }
                } else {
                    req.body = {}
                }

                try {
                    const moduleUrl = pathToFileURL(join(rootDir, 'api', 'sendPrompt.js')).href
                    const { default: handler } = await import(moduleUrl)
                    await handler(req, res)
                } catch (err) {
                    console.error(err)
                    if (!res.writableEnded) {
                        res.status(500).json({
                            success: false,
                            error: err?.message ?? String(err),
                        })
                    }
                }
            })
        },
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, projectRoot, '')
    if (env.GROQ_API_KEY) {
        process.env.GROQ_API_KEY = env.GROQ_API_KEY
    }

    return {
        root: 'src/',
        /** Load `.env` from repo root (next to this file), not from `src/`. */
        envDir: projectRoot,
        publicDir: '../static/',
        server: {
            host: true,
            open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env),
        },
        build: {
            outDir: '../dist',
            emptyOutDir: true,
            sourcemap: true,
            rollupOptions: {
                input: {
                    main: resolve(projectRoot, 'src/index.html'),
                    juego: resolve(projectRoot, 'src/juego.html'),
                },
            },
        },
        plugins: [
            restart({ restart: ['../static/**'] }),
            glsl(),
            sendPromptApiDev(projectRoot),
        ],
    }
})
