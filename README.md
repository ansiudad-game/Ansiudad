# Ansiudad 2.0

Ansiudad es un juego de mesa que aborda la ecoansiedad y busca convertir la preocupación por el cambio climático en acción. Creado por Gabriel Sánchez, Andrea Norzagaray, y Emmanuel Balderas. Esta es la versión 2 del sitio web pensada para informar sobre el juego y a la vez ser un facilitador o "expansión" a través de IA.

---
---

```bash
# Instalar dependencias (sólo se hace la primera vez al descargar el repositorio)
npm install

# Inicializa un servidor local en el puerto "localhost:8080"
npm run dev

# Compila los archivos para publicar el proyecto en la carpeta "dist/"
npm run build
```

---

## Cloudflare Workers (plan Free)

Requiere Node.js 22 o superior. Instalar dependencias con `npm ci`.

- `npm run dev`: Vite con la API local; usa el archivo `.env` de la raíz (ver `.env.example`).
- `npm run test:api`: pruebas de la API con respuestas simuladas de Groq, sin consumir cuota.
- `npm run dev:cloudflare`: compila y sirve el sitio y la API en el runtime local de Workers. Wrangler lee `.env` o `.dev.vars` (si existe, tiene prioridad).
- `npm run check:cloudflare`: compila y empaqueta el Worker sin publicar.

`wrangler.jsonc` sirve `dist/` como archivos estáticos y envía `/api/*` al Worker. Conserva `/juego.html`; las rutas inexistentes devuelven 404. La portada utiliza únicamente `static/vid/ansiudad.webm`.

La lógica de Groq está en `server/generateGame.js`. `worker.js` adapta las peticiones de Cloudflare; `api/sendPrompt.js` conserva la compatibilidad con Vercel durante la transición. Las cantidades admitidas coinciden con la interfaz: 1–5 equipos y 1–25 roles. El tema admite hasta 2000 caracteres. La API no implementa todavía control de frecuencia; las cuotas de Groq son independientes del plan de Cloudflare.

### Publicación posterior

1. Autenticarse con `npx wrangler login`.
2. Configurar el secreto con `npx wrangler secret put GROQ_API_KEY` (introducirlo cuando se solicite, nunca guardarlo en la configuración). Si se solicita crear el Worker, usar el nombre `ansiudad`.
3. Revisar `GROQ_MODEL` en `wrangler.jsonc` y ejecutar `npm run deploy:cloudflare`.
4. Probar la URL `workers.dev` antes de conectar el dominio. Este paso no configura DNS ni dominios.

La comprobación local no valida la cuota ni el tiempo de CPU del plan gratuito en producción.
