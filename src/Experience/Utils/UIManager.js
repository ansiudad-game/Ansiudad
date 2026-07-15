import Experience from '../Experience.js'
import EventEmitter from './EventEmitter.js'
import gsap from 'gsap'
export default class UIManager extends EventEmitter {
    constructor() {
        super()

        this.experience = new Experience()
        this.events = this.experience.events
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.appState = this.experience.appState
        this.currentView = this.appState.currentStep
        this.response = null
        this.cityIntroComplete = false
        this.initUI();

        this.addHandlers();

        this.events.on('cityIntroComplete', () => {
            this.cityIntroComplete = true
            if (this.appState.currentStep === 0) {
                this.showLlamaHelperIntro()
            }
        })

        this.showInputNumber();
        // Bind the method to preserve context
        this.sendPrompt = this.sendPrompt.bind(this);
    }

    initUI() {
        this.views = document.querySelectorAll('.slideContainer');
        if (this.views.length >= 1) {
            this.views.forEach((view, idx) => {
                if (idx == 0) view.classList.add('show');
                else view.classList.remove('show');
            });
        }

        this.initTriggers();
        this.handleLlamaHelper(this.appState.currentStep);
    }

    initTriggers() {
        this.nextStepTriggers = [];
        this.goToLLamaTriggers = [];

        this.startButton = document.getElementById('firstStepBtn');
        this.nextStepTriggers.push(this.startButton);
        const nextButtons = document.querySelectorAll('.goToNextStepBtn');
        nextButtons.forEach(element => { this.nextStepTriggers.push(element) });
        this.nextStepTriggers.forEach(element => {
            element.addEventListener('click', this.fireNextStep.bind(this));
        });

        this.prevStepTriggers = [];
        const prevButtons = document.querySelectorAll('.goToPrevStepBtn');
        prevButtons.forEach(element => { this.prevStepTriggers.push(element) });
        this.prevStepTriggers.forEach(element => {
            element.addEventListener('click', this.firePrevStep.bind(this));
        });

        const goToLlamaBtns = document.querySelectorAll('.goToLlamaGeneration');
        goToLlamaBtns.forEach(element => { this.goToLLamaTriggers.push(element) });
        this.goToLLamaTriggers.forEach(element => {
            element.addEventListener('click', this.fireLlamaStep.bind(this));
        });
    }

    fireNextStep() {
        this.events.trigger('nextStep');
    }

    firePrevStep() {
        this.events.trigger('prevStep');
    }

    fireLlamaStep() {
        this.events.trigger('goToStep', [7]);
    }


    addHandlers() {
        this.appState.on('stepChange', (newStep) => {
            if (this.destroyed) return;
            this.switchViews(newStep);
        });
    }

    switchViews(newStep) {
        this.handleLlamaHelper(newStep);
        this.views[this.currentView].classList.remove('show');
        this.views[this.currentView].classList.remove('noBlur');
        this.views[newStep].classList.add('show');
        setTimeout(_ => {
            this.views[newStep].classList.add('noBlur');
        }, 200);

        this.currentView = newStep;

        const cityScene = this.experience.world.CityScene;
        const portalScene = this.experience.world.PortalScene;
        const tunnelScene = this.experience.world.TunnelScene;

        if (newStep <= 4 || newStep == 9) {
            cityScene.isActivated = true;
            portalScene.isActivated = false;
            tunnelScene.isActivated = false;
        } else if (newStep == 5 || newStep == 6) {
            cityScene.isActivated = false;
            portalScene.isActivated = true;
            tunnelScene.isActivated = false;
        } else if (newStep == 7 || newStep == 8) {
            const submitButton = document.querySelector('#submit');
            cityScene.isActivated = false;
            portalScene.isActivated = false;
            tunnelScene.isActivated = true;
            if (submitButton && !submitButton.dataset.promptBound) {
                submitButton.dataset.promptBound = 'true';
                submitButton.addEventListener('click', this.sendPrompt);
            }
        }

        /* console.log({
            'City Scene': this.experience.world.CityScene.isActivated,
            'Portal Scene': this.experience.world.PortalScene.isActivated,
            'Tunnel Scene': this.experience.world.TunnelScene.isActivated,
            step: newStep
        }); */
    }
    async sendPrompt(e) {
        e.preventDefault();
        try {
            const numOfTeamsField = document.querySelector('#number-of-teams');
            const numOfPlayersField = document.querySelector('#number-of-roles');
            const inputField = document.querySelector('#theme-input');

            if (!numOfTeamsField || !numOfPlayersField || !inputField) {
                console.error('Required input fields not found');
                return;
            }

            const prompt = inputField.value.trim();
            const _numberOfTeams = numOfTeamsField.value;
            const _numberOfRoles = numOfPlayersField.value;

            this.events.trigger('goToStep', [8]);

            const response = await fetch('/api/sendPrompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    _numberOfTeams,
                    _numberOfRoles
                })
            });

            const responseData = await response.json().catch(() => ({}));

            if (!response.ok || !responseData.success) {
                throw new Error(responseData.error || `Server responded with status: ${response.status}`);
            }

            this.response = responseData;

            if (responseData.data?.events) {
                this.events.trigger('goToStep', [9]);

                const cityScene = this.experience.world.CityScene;
                const tunnelScene = this.experience.world.TunnelScene;

                cityScene.isActivated = true;
                tunnelScene.isActivated = false;

                const eventBox = document.querySelector('#llama-event');
                const rolesBox = document.querySelector('#llama-roles');

                if (eventBox && responseData.data.events.events) {
                    eventBox.innerHTML = '';
                    responseData.data.events.events.forEach(event => {
                        if (event?.title && event?.description) {
                            const eventContainer = document.createElement('div');

                            const eventTitle = document.createElement('h3');
                            eventTitle.textContent = event.title;
                            eventContainer.appendChild(eventTitle);

                            const eventDescription = document.createElement('p');
                            eventDescription.textContent = event.description;
                            eventContainer.appendChild(eventDescription);

                            eventBox.appendChild(eventContainer);
                        }
                    });
                }

                if (rolesBox && responseData.data.roles?.roles) {
                    rolesBox.innerHTML = '';
                    responseData.data.roles.roles.forEach(role => {
                        if (role?.name || role?.title) {
                            const roleContainer = document.createElement('div');

                            const roleTitle = document.createElement('h3');
                            roleTitle.textContent = role.name || role.title;
                            roleContainer.appendChild(roleTitle);

                            const rolePriorities = document.createElement('p');
                            rolePriorities.textContent = role.priorities || role.prioridades || '';
                            roleContainer.appendChild(rolePriorities);

                            rolesBox.appendChild(roleContainer);
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error processing response:', error);
            alert(`No se pudo generar el incidente: ${error.message}`);
            this.events.trigger('goToStep', [7]);
        }
    }


    handleLlamaHelper(newStep) {
        const element = document.getElementById('llama-helper');
        if (!element) return;

        if (newStep == 0 && this.cityIntroComplete) {
            element.style.display = 'flex';
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
            element.style.color = '';
            element.classList.remove('is-intro-pending');
        } else if (newStep == 0) {
            element.style.display = 'flex';
            element.style.opacity = '0';
            element.style.pointerEvents = 'none';
            element.classList.add('is-intro-pending');
        } else {
            element.style.display = 'none';
            element.classList.remove('is-intro-pending');
        }
    }

    showLlamaHelperIntro() {
        const element = document.getElementById('llama-helper');
        if (!element) return;

        element.style.display = 'flex';
        element.classList.remove('is-intro-pending');

        gsap.fromTo(
            element,
            { opacity: 0, y: 28 },
            {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: 'power2.out',
                pointerEvents: 'auto',
                onStart: () => {
                    element.style.pointerEvents = 'auto'
                },
            }
        )
    }

    showInputNumber() {
        const numOfTeamsField = document.querySelector('#number-of-teams');
        const teamNumber = document.querySelector('#team-number');
        const numOfPlayersField = document.querySelector('#number-of-roles');
        const playerNumber = document.querySelector('#role-number');

        teamNumber.textContent = numOfTeamsField.value;
        playerNumber.textContent = numOfPlayersField.value;

        numOfTeamsField.addEventListener('change', (e) => {
            teamNumber.textContent = e.target.value;
        })
        numOfPlayersField.addEventListener('change', (e) => {
            playerNumber.textContent = e.target.value;
        })
    }

    destroy() {
        this.destroyed = true;
    }
}
//test