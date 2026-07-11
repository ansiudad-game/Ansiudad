import Experience from '../Experience.js'
import EventEmitter from './EventEmitter.js'

let instance = null

export default class GlobalEvents extends EventEmitter
{
    constructor() {
        super()

        // Singleton
        if(instance)
        {
            return instance
        }
        instance = this
        
        // Global access
        window.globalEvents = this


        this.addHandlers();
        this.tester = 'ready!'
    }

    addHandlers() {
        this.on('nextStep', this.goToNextStep.bind(this));
        this.on('prevStep', this.goToPrevStep.bind(this));
        this.on('goToStep', this.goToStep.bind(this));
    }

    goToNextStep() {
        this.trigger('appStateNextStep');
    }

    goToPrevStep() {
        this.trigger('appStatePrevStep');
    }
    
    goToStep(step) {
        this.trigger('appStateStep', [step]);
    }
}