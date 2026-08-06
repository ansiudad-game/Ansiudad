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
        this.resultsStacksBound = false
        this.resultsAnimating = { event: false, role: false }
        this.resultsPointer = { event: null, role: null }
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
                    let eventCount = 0;
                    responseData.data.events.events.forEach(event => {
                        if (event?.title && event?.description) {
                            eventCount += 1;
                            const eventCard = document.createElement('article');
                            eventCard.className = 'slide7-result-card slide7-results__stack-card';
                            eventCard.dataset.deckIndex = String(eventCount);

                            const eventLabel = document.createElement('p');
                            eventLabel.className = 'slide7-result-card__player';
                            eventLabel.textContent = `INCIDENTE ${eventCount}`;
                            eventCard.appendChild(eventLabel);

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
                    let roleCount = 0;
                    responseData.data.roles.roles.forEach((role) => {
                        if (role?.name || role?.title) {
                            roleCount += 1;
                            const roleCard = document.createElement('article');
                            roleCard.className = 'slide7-result-card slide7-result-card--role slide7-results__stack-card';
                            roleCard.dataset.deckIndex = String(roleCount);

                            const playerLabel = document.createElement('p');
                            playerLabel.className = 'slide7-result-card__player';
                            playerLabel.textContent = `JUGADOR ${roleCount}`;
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

        eventPrev?.addEventListener('click', (e) => {
            e.preventDefault();
            this.recycleResultsDeck('event', -1);
        });

        eventNext?.addEventListener('click', (e) => {
            e.preventDefault();
            this.recycleResultsDeck('event', 1);
        });

        rolesPrev?.addEventListener('click', (e) => {
            e.preventDefault();
            this.recycleResultsDeck('role', -1);
        });

        rolesNext?.addEventListener('click', (e) => {
            e.preventDefault();
            this.recycleResultsDeck('role', 1);
        });

        this.bindResultsPointer('event');
        this.bindResultsPointer('role');

        this.resultsStacksBound = true;
        this.syncResultsStack('event');
        this.syncResultsStack('role');
    }

    getResultsTrack(kind) {
        return document.getElementById(kind === 'event' ? 'llama-event' : 'llama-roles');
    }

    getResultsTinder(kind) {
        return document.querySelector(`.slide7-tinder[data-tinder="${kind}"]`);
    }

    getResultsCards(kind) {
        const track = this.getResultsTrack(kind);
        if (!track) return [];
        return [...track.querySelectorAll('.slide7-results__stack-card')];
    }

    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    stackTransformForOffset(offset) {
        const scale = Math.max((20 - offset) / 20, 0.88);
        const y = -34 * offset;
        return `scale(${scale}) translateY(${y}px)`;
    }

    syncResultsStack(kind) {
        const cards = this.getResultsCards(kind);
        const tinder = this.getResultsTinder(kind);
        const prev = document.getElementById(kind === 'event' ? 'slide7EventPrev' : 'slide7RolesPrev');
        const next = document.getElementById(kind === 'event' ? 'slide7EventNext' : 'slide7RolesNext');
        const nav = prev?.closest('.slide7-results__nav');
        const visibleDepth = cards.length;

        cards.forEach((card, index) => {
            card.classList.remove('is-active', 'is-stacked', 'is-moving', 'is-removed', 'is-behind-1', 'is-behind-2');
            card.style.transform = '';

            if (index >= visibleDepth) {
                card.style.opacity = '0';
                card.style.visibility = 'hidden';
                card.style.pointerEvents = 'none';
                card.style.zIndex = '0';
                return;
            }

            // Keep stacked titles readable so you can count the deck.
            card.style.opacity = index === 0 ? '1' : String(Math.max(0.62, 1 - index * 0.07));
            card.style.visibility = 'visible';
            card.style.pointerEvents = index === 0 ? 'auto' : 'none';
            card.style.zIndex = String(cards.length - index);
            card.style.transform = this.stackTransformForOffset(index);

            if (index === 0) card.classList.add('is-active');
            else card.classList.add('is-stacked');
        });

        const canLoop = cards.length > 1;
        if (prev) prev.disabled = !canLoop;
        if (next) next.disabled = !canLoop;
        if (nav) nav.hidden = !canLoop;

        const counter = document.getElementById(kind === 'event' ? 'slide7EventCounter' : 'slide7RolesCounter');
        const total = Math.max(cards.length, 1);
        const current = cards[0]?.dataset.deckIndex || (cards.length ? '1' : '0');
        if (counter) counter.textContent = `${current}/${total}`;

        if (tinder) {
            tinder.classList.remove('is-love', 'is-nope');
            tinder.classList.add('is-loaded');
        }

        const track = this.getResultsTrack(kind);
        if (track) {
            const peekCount = Math.max(cards.length - 1, 0);
            track.style.paddingTop = `calc(var(--slide7-stack-peek, 2.05rem) * ${Math.min(peekCount, 6)})`;
        }
    }

    recycleResultsDeck(kind, direction) {
        if (this.resultsAnimating[kind]) return;

        const track = this.getResultsTrack(kind);
        const cards = this.getResultsCards(kind);
        if (!track || cards.length <= 1) return;

        const throwDir = direction >= 0 ? 1 : -1;

        if (this.prefersReducedMotion()) {
            if (throwDir > 0) track.appendChild(cards[0]);
            else track.insertBefore(cards[cards.length - 1], cards[0]);
            this.syncResultsStack(kind);
            return;
        }

        this.resultsAnimating[kind] = true;
        const tinder = this.getResultsTinder(kind);
        const moveOutWidth = Math.max(document.body.clientWidth * 1.15, 520);

        if (throwDir > 0) {
            const card = cards[0];
            tinder?.classList.add('is-love');
            card.classList.add('is-removed');
            card.style.transform = `translate(${moveOutWidth}px, -90px) rotate(-28deg)`;

            window.setTimeout(() => {
                card.classList.remove('is-removed');
                card.style.transform = '';
                track.appendChild(card);
                this.syncResultsStack(kind);
                this.resultsAnimating[kind] = false;
            }, 280);
            return;
        }

        const top = cards[0];
        const last = cards[cards.length - 1];
        tinder?.classList.add('is-nope');
        top.classList.add('is-removed');
        top.style.transform = `translate(-${moveOutWidth}px, -90px) rotate(28deg)`;

        window.setTimeout(() => {
            top.classList.remove('is-removed');
            top.style.transform = '';
            track.insertBefore(last, track.firstElementChild);
            this.syncResultsStack(kind);
            this.resultsAnimating[kind] = false;
        }, 280);
    }

    bindResultsPointer(kind) {
        const track = this.getResultsTrack(kind);
        if (!track || track.dataset.tinderBound === 'true') return;
        track.dataset.tinderBound = 'true';

        const onPointerDown = (event) => {
            if (event.button !== undefined && event.button !== 0) return;
            if (this.resultsAnimating[kind]) return;

            const cards = this.getResultsCards(kind);
            const card = cards[0];
            if (!card || !card.contains(event.target)) return;
            if (cards.length <= 1) return;

            this.resultsPointer[kind] = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                lastX: event.clientX,
                lastY: event.clientY,
                lastTime: event.timeStamp,
                velocityX: 0,
                card,
            };

            card.classList.add('is-moving');
            card.setPointerCapture?.(event.pointerId);
        };

        const onPointerMove = (event) => {
            const state = this.resultsPointer[kind];
            if (!state || state.pointerId !== event.pointerId) return;

            const deltaX = event.clientX - state.startX;
            const deltaY = event.clientY - state.startY;
            const dt = Math.max(event.timeStamp - state.lastTime, 1);
            state.velocityX = (event.clientX - state.lastX) / dt;
            state.lastX = event.clientX;
            state.lastY = event.clientY;
            state.lastTime = event.timeStamp;

            const tinder = this.getResultsTinder(kind);
            tinder?.classList.toggle('is-love', deltaX > 0);
            tinder?.classList.toggle('is-nope', deltaX < 0);

            const rotate = deltaX * 0.03 * (deltaY / 80 || 1);
            state.card.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${rotate}deg)`;
        };

        const finishPointer = (event) => {
            const state = this.resultsPointer[kind];
            if (!state || state.pointerId !== event.pointerId) return;

            const card = state.card;
            const deltaX = event.clientX - state.startX;
            const deltaY = event.clientY - state.startY;
            const tinder = this.getResultsTinder(kind);

            card.classList.remove('is-moving');
            tinder?.classList.remove('is-love', 'is-nope');
            this.resultsPointer[kind] = null;

            const cards = this.getResultsCards(kind);
            const shouldThrow = Math.abs(deltaX) > 72 || Math.abs(state.velocityX) > 0.45;

            if (!shouldThrow || cards.length <= 1) {
                card.style.transform = this.stackTransformForOffset(0);
                return;
            }

            // Both swipe directions loop the top card to the back (CodePen style).
            this.resultsAnimating[kind] = true;
            const moveOutWidth = Math.max(document.body.clientWidth, 420);
            const endX = Math.max(Math.abs(state.velocityX) * moveOutWidth, moveOutWidth);
            const toX = deltaX > 0 ? endX : -endX;
            const endY = Math.abs(deltaY) + 40;
            const rotate = deltaX * 0.03 * (deltaY / 80 || 1);

            tinder?.classList.toggle('is-love', deltaX > 0);
            tinder?.classList.toggle('is-nope', deltaX < 0);
            card.classList.add('is-removed');
            card.style.transform = `translate(${toX}px, ${endY}px) rotate(${rotate}deg)`;

            window.setTimeout(() => {
                card.classList.remove('is-removed');
                card.style.transform = '';
                track.appendChild(card);
                this.syncResultsStack(kind);
                this.resultsAnimating[kind] = false;
            }, 280);
        };

        track.addEventListener('pointerdown', onPointerDown);
        track.addEventListener('pointermove', onPointerMove);
        track.addEventListener('pointerup', finishPointer);
        track.addEventListener('pointercancel', finishPointer);
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