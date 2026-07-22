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
        this.eventStackIndex = 0
        this.roleStackIndex = 0
        this.resultsStacksBound = false
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
        this.setupResultsStacks();
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
        this.events.trigger('goToStep', [6]);
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

        if (newStep <= 3 || newStep == 8) {
            cityScene.isActivated = true;
            portalScene.isActivated = false;
            tunnelScene.isActivated = false;
        } else if (newStep == 4 || newStep == 5) {
            cityScene.isActivated = false;
            portalScene.isActivated = true;
            tunnelScene.isActivated = false;
        } else if (newStep == 6 || newStep == 7) {
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

            this.events.trigger('goToStep', [7]);

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
                this.events.trigger('goToStep', [8]);

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
                            const eventCard = document.createElement('article');
                            eventCard.className = 'slide7-result-card slide7-results__stack-card';

                            const eventTitle = document.createElement('h3');
                            eventTitle.className = 'slide7-result-card__title';
                            eventTitle.textContent = event.title;
                            eventCard.appendChild(eventTitle);

                            const eventDescription = document.createElement('p');
                            eventDescription.className = 'slide7-result-card__body';
                            eventDescription.textContent = event.description;
                            eventCard.appendChild(eventDescription);

                            eventBox.appendChild(eventCard);
                        }
                    });
                }

                if (rolesBox && responseData.data.roles?.roles) {
                    rolesBox.innerHTML = '';
                    responseData.data.roles.roles.forEach((role, index) => {
                        if (role?.name || role?.title) {
                            const roleCard = document.createElement('article');
                            roleCard.className = 'slide7-result-card slide7-result-card--role slide7-results__stack-card';

                            const playerLabel = document.createElement('p');
                            playerLabel.className = 'slide7-result-card__player';
                            playerLabel.textContent = `JUGADOR ${index + 1}`;
                            roleCard.appendChild(playerLabel);

                            const roleTitle = document.createElement('h3');
                            roleTitle.className = 'slide7-result-card__title';
                            roleTitle.textContent = role.name || role.title;
                            roleCard.appendChild(roleTitle);

                            const rolePriorities = document.createElement('p');
                            rolePriorities.className = 'slide7-result-card__body';
                            rolePriorities.textContent = role.priorities || role.prioridades || '';
                            roleCard.appendChild(rolePriorities);

                            rolesBox.appendChild(roleCard);
                        }
                    });
                }

                this.eventStackIndex = 0;
                this.roleStackIndex = 0;
                this.syncResultsStack('event');
                this.syncResultsStack('role');
            }
        } catch (error) {
            console.error('Error processing response:', error);
            alert(`No se pudo generar el incidente: ${error.message}`);
            this.events.trigger('goToStep', [6]);
        }
    }

    setupResultsStacks() {
        if (this.resultsStacksBound) return;

        const eventPrev = document.getElementById('slide7EventPrev');
        const eventNext = document.getElementById('slide7EventNext');
        const rolesPrev = document.getElementById('slide7RolesPrev');
        const rolesNext = document.getElementById('slide7RolesNext');

        eventPrev?.addEventListener('click', () => {
            if (this.eventStackIndex <= 0) return;
            this.eventStackIndex -= 1;
            this.syncResultsStack('event');
        });

        eventNext?.addEventListener('click', () => {
            const cards = this.getResultsCards('event');
            if (this.eventStackIndex >= cards.length - 1) return;
            this.eventStackIndex += 1;
            this.syncResultsStack('event');
        });

        rolesPrev?.addEventListener('click', () => {
            if (this.roleStackIndex <= 0) return;
            this.roleStackIndex -= 1;
            this.syncResultsStack('role');
        });

        rolesNext?.addEventListener('click', () => {
            const cards = this.getResultsCards('role');
            if (this.roleStackIndex >= cards.length - 1) return;
            this.roleStackIndex += 1;
            this.syncResultsStack('role');
        });

        this.resultsStacksBound = true;
        this.syncResultsStack('event');
        this.syncResultsStack('role');
    }

    getResultsCards(kind) {
        const trackId = kind === 'event' ? 'llama-event' : 'llama-roles';
        const track = document.getElementById(trackId);
        if (!track) return [];
        return [...track.querySelectorAll('.slide7-results__stack-card')];
    }

    syncResultsStack(kind) {
        const cards = this.getResultsCards(kind);
        const index = kind === 'event' ? this.eventStackIndex : this.roleStackIndex;
        const prev = document.getElementById(kind === 'event' ? 'slide7EventPrev' : 'slide7RolesPrev');
        const next = document.getElementById(kind === 'event' ? 'slide7EventNext' : 'slide7RolesNext');
        const nav = prev?.closest('.slide7-results__nav');

        cards.forEach((card, cardIndex) => {
            card.classList.remove('is-active', 'is-behind-1', 'is-behind-2');
            if (cardIndex === index) card.classList.add('is-active');
            else if (cardIndex === index - 1) card.classList.add('is-behind-1');
            else if (cardIndex === index - 2) card.classList.add('is-behind-2');
        });

        if (prev) prev.disabled = index <= 0 || cards.length <= 1;
        if (next) next.disabled = index >= cards.length - 1 || cards.length <= 1;
        if (nav) nav.hidden = cards.length <= 1;

        const counter = document.getElementById(kind === 'event' ? 'slide7EventCounter' : 'slide7RolesCounter');
        const total = Math.max(cards.length, 1);
        const current = cards.length ? index + 1 : 0;
        if (counter) counter.textContent = `${current}/${total}`;
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
            { opacity: 0, yPercent: -50, y: 28 },
            {
                opacity: 1,
                yPercent: -50,
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