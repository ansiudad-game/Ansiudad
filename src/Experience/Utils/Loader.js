import Experience from '../Experience.js'
import EventEmitter from './EventEmitter.js'

const STATUS_MESSAGES = [
    'Trazando ciudad',
    'Conectando caminos',
    '¡La ciudad está lista!'
]

const PHASE_HOLD_MS = 700
const FINAL_HOLD_MS = 1100

export default class Loader extends EventEmitter
{
    constructor() {
        super()
        this.experience = new Experience()
        this.events = this.experience.events
        this.resources = this.experience.resources
        this.statusEl = document.getElementById('loader-status')
        this.phase = 0
        this.hidden = false
        this.assetsReady = false
        this.messagesDone = false

        this.resources.on('ready', () => {
            this.assetsReady = true
            this.tryFinish()
        })

        this.playMessages()
    }

    playMessages() {
        window.clearTimeout(this.phaseTimer)
        this.phaseTimer = window.setTimeout(() => {
            this.showStatus(1)
            this.phaseTimer = window.setTimeout(() => {
                this.showStatus(2)
                this.phaseTimer = window.setTimeout(() => {
                    this.messagesDone = true
                    this.tryFinish()
                }, FINAL_HOLD_MS)
            }, PHASE_HOLD_MS)
        }, PHASE_HOLD_MS)
    }

    tryFinish() {
        if (this.hidden || !this.assetsReady || !this.messagesDone) return
        this.destroyLoader()
    }

    showStatus(phase) {
        if (phase <= this.phase || phase >= STATUS_MESSAGES.length) return

        this.phase = phase
        if (!this.statusEl) return

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduceMotion) {
            this.statusEl.textContent = STATUS_MESSAGES[this.phase]
            return
        }

        window.clearTimeout(this.fadeTimer)
        this.statusEl.classList.add('is-fading')
        this.fadeTimer = window.setTimeout(() => {
            if (!this.statusEl) return
            this.statusEl.textContent = STATUS_MESSAGES[this.phase]
            this.statusEl.classList.remove('is-fading')
        }, 160)
    }

    destroyLoader() {
        if (this.hidden) return
        this.hidden = true
        window.clearTimeout(this.fadeTimer)
        window.clearTimeout(this.phaseTimer)

        this.loaderContainer = document.getElementById('loader-container');
        if (this.loaderContainer) {
            this.loaderContainer.style.display = 'none'
            this.loaderContainer.remove()
        }

        this.trigger('loaderHidden')
    }
}