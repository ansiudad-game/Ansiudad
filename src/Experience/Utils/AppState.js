import Experience from '../Experience.js'
import EventEmitter from './EventEmitter.js'

export default class AppState extends EventEmitter
{
    constructor() {
        super()

        this.experience = new Experience()
        this.events = this.experience.events
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas

        this.initStates();
        this.initStepsManager();
        this.addHandlers();
    }

    initStates() {
        this.totalSteps = 7;
        this.bgColor = "#410062";
    }

    reset() {
        this.currentStep = 0;
        this.trigger('stepChange', [this.currentStep]);
    }

    addHandlers() {
        this.events.on('appStateNextStep', this.nextStep.bind(this));
        this.events.on('appStatePrevStep', this.prevStep.bind(this));
        this.events.on('appStateStep', this.goToStep.bind(this));
        this.on('stepChange', this.updateBgColor.bind(this));
    }

    initStepsManager() {
        this.mainButton = document.getElementById('nextStepHelper');
        if (this.mainButton) this.mainButton.addEventListener('click', this.nextStep.bind(this));

        // this.stepsVisualizer = document.getElementById('stepsVisualizer');

        this.currentStep = 0;
    }

    nextStep() {
        this.currentStep++;
        this.currentStep %= this.totalSteps;
        // this.stepsVisualizer.innerText = this.currentStep;

        this.trigger('stepChange', [this.currentStep]);
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.trigger('stepChange', [this.currentStep]);
        }
    }

    goToStep(step) {
        this.currentStep = step;
        this.currentStep %= this.totalSteps;
        // this.stepsVisualizer.innerText = this.currentStep;
        
        this.trigger('stepChange', [this.currentStep]);
    }

    updateBgColor() {
        if (this.currentStep == 2 || this.currentStep == 4) {
            if (this.bgColor != '#170027') {
                this.bgColor = '#170027';
                this.trigger('bgColorChange', [this.bgColor]);
            }
        } else if ( (this.currentStep >= 0 && this.currentStep < 2) || this.currentStep == this.totalSteps - 1) {
            if (this.bgColor != '#410062') {
                this.bgColor = '#410062';
                this.trigger('bgColorChange', [this.bgColor]);
            }
        }
    }
}