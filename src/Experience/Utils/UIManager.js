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
        this.resultsHandIndex = { event: 0, role: 0 }
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
                            eventCard.className = 'slide7-result-card';
                            eventCard.dataset.deckIndex = String(eventCount);
                            eventCard.style.setProperty('--i', String(eventCount - 1));
                            eventCard.tabIndex = 0;

                            const eventLabel = document.createElement('p');
                            eventLabel.className = 'slide7-result-card__player';
                            eventLabel.textContent = `INCIDENTE ${eventCount}`;
                            eventCard.appendChild(eventLabel);

                            const eventTitle = document.createElement('h3');
                            eventTitle.className = 'slide7-result-card__title';
                            eventTitle.textContent = this.limitCardWords(event.title, 6);
                            eventCard.appendChild(eventTitle);

                            const eventDescription = document.createElement('p');
                            eventDescription.className = 'slide7-result-card__body';
                            eventDescription.textContent = this.limitCardWords(event.description, 28);
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
                            roleCard.className = 'slide7-result-card slide7-result-card--role';
                            roleCard.dataset.deckIndex = String(roleCount);
                            roleCard.style.setProperty('--i', String(roleCount - 1));
                            roleCard.tabIndex = 0;

                            const playerLabel = document.createElement('p');
                            playerLabel.className = 'slide7-result-card__player';
                            playerLabel.textContent = `JUGADOR ${roleCount}`;
                            roleCard.appendChild(playerLabel);

                            const roleTitle = document.createElement('h3');
                            roleTitle.className = 'slide7-result-card__title';
                            roleTitle.textContent = this.limitCardWords(role.name || role.title, 6);
                            roleCard.appendChild(roleTitle);

                            const rolePriorities = document.createElement('p');
                            rolePriorities.className = 'slide7-result-card__body';
                            rolePriorities.textContent = this.limitCardWords(role.priorities || role.prioridades || '', 28);
                            roleCard.appendChild(rolePriorities);

                            rolesBox.appendChild(roleCard);
                        }
                    });
                }

                this.resultsHandIndex = { event: 0, role: 0 };
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

        this.resultsHandIndex = { event: 0, role: 0 };

        const eventPrev = document.getElementById('slide7EventPrev');
        const eventNext = document.getElementById('slide7EventNext');
        const rolesPrev = document.getElementById('slide7RolesPrev');
        const rolesNext = document.getElementById('slide7RolesNext');

        eventPrev?.addEventListener('click', (e) => {
            e.preventDefault();
            this.stepResultsHand('event', -1);
        });

        eventNext?.addEventListener('click', (e) => {
            e.preventDefault();
            this.stepResultsHand('event', 1);
        });

        rolesPrev?.addEventListener('click', (e) => {
            e.preventDefault();
            this.stepResultsHand('role', -1);
        });

        rolesNext?.addEventListener('click', (e) => {
            e.preventDefault();
            this.stepResultsHand('role', 1);
        });

        this.bindResultsHand('event');
        this.bindResultsHand('role');

        this.resultsStacksBound = true;
        this.syncResultsStack('event');
        this.syncResultsStack('role');
    }

    getResultsTrack(kind) {
        return document.getElementById(kind === 'event' ? 'llama-event' : 'llama-roles');
    }

    limitCardWords(text, maxWords) {
        const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
        if (!normalized) return '';
        const words = normalized.split(' ');
        if (words.length <= maxWords) return normalized;
        return `${words.slice(0, maxWords).join(' ')}…`;
    }

    getResultsCards(kind) {
        const track = this.getResultsTrack(kind);
        if (!track) return [];
        return [...track.querySelectorAll('.slide7-result-card')];
    }

    isResultsMobileLayout() {
        return window.matchMedia('(max-width: 767px)').matches;
    }

    applyResultsMobileStackClasses(cards, activeIndex) {
        const total = cards.length;
        cards.forEach((card, index) => {
            card.classList.remove('is-active', 'is-behind-1', 'is-behind-2', 'is-stack-visible', 'is-stacked-behind');
            card.style.removeProperty('--stack-i');
            card.tabIndex = index === activeIndex ? 0 : -1;
        });

        if (!total) return;

        cards[activeIndex]?.classList.add('is-active');

        if (total > 1) {
            const behind1 = (activeIndex - 1 + total) % total;
            if (behind1 !== activeIndex) cards[behind1].classList.add('is-behind-1');
        }
        if (total > 2) {
            const behind2 = (activeIndex - 2 + total) % total;
            if (behind2 !== activeIndex) cards[behind2].classList.add('is-behind-2');
        }
    }

    updateResultsCounter(kind, cards, activeIndex) {
        const counter = document.getElementById(kind === 'event' ? 'slide7EventCounter' : 'slide7RolesCounter');
        const total = Math.max(cards.length, 1);
        const current = cards[activeIndex]?.dataset.deckIndex || (cards.length ? String(activeIndex + 1) : '0');
        if (counter) counter.textContent = `${current}/${total}`;
    }

    syncResultsStack(kind) {
        const track = this.getResultsTrack(kind);
        if (!track) return;

        const cards = [...track.querySelectorAll('.slide7-result-card')];
        const prev = document.getElementById(kind === 'event' ? 'slide7EventPrev' : 'slide7RolesPrev');
        const next = document.getElementById(kind === 'event' ? 'slide7EventNext' : 'slide7RolesNext');
        const nav = prev?.closest('.slide7-results__nav');

        if (!this.resultsHandIndex) this.resultsHandIndex = { event: 0, role: 0 };
        if (this.resultsHandIndex[kind] >= cards.length) this.resultsHandIndex[kind] = Math.max(cards.length - 1, 0);
        if (this.resultsHandIndex[kind] < 0) this.resultsHandIndex[kind] = 0;

        const activeIndex = this.resultsHandIndex[kind];
        const mobile = this.isResultsMobileLayout();
        const perRow = 7;

        track.classList.add('is-loaded');
        track.classList.toggle('is-mobile-stack', mobile);
        track.classList.toggle('has-extra-rows', !mobile && cards.length > perRow);

        if (mobile) {
            let stack = track.querySelector(':scope > .slide7-hand__stack');
            const stackedCards = stack ? [...stack.querySelectorAll('.slide7-result-card')] : [];
            const sameDeck =
                stack &&
                stackedCards.length === cards.length &&
                stackedCards.every((card, index) => card === cards[index]);

            if (!sameDeck) {
                track.replaceChildren();
                stack = document.createElement('div');
                stack.className = 'slide7-hand__stack';
                cards.forEach((card, index) => {
                    card.style.setProperty('--i', '0');
                    card.dataset.deckIndex = card.dataset.deckIndex || String(index + 1);
                    stack.appendChild(card);
                });
                track.appendChild(stack);
            }

            this.applyResultsMobileStackClasses([...stack.querySelectorAll('.slide7-result-card')], activeIndex);
        } else {
            track.replaceChildren();
            for (let start = 0; start < cards.length; start += perRow) {
                const rowCards = cards.slice(start, start + perRow);
                const row = document.createElement('div');
                row.className = 'slide7-hand__row';
                row.style.setProperty('--n', String(rowCards.length));

                rowCards.forEach((card, indexInRow) => {
                    const absoluteIndex = start + indexInRow;
                    card.style.setProperty('--i', String(indexInRow));
                    card.style.removeProperty('--stack-i');
                    card.dataset.deckIndex = card.dataset.deckIndex || String(absoluteIndex + 1);
                    card.classList.remove('is-behind-1', 'is-behind-2', 'is-stack-visible');
                    card.classList.toggle('is-active', absoluteIndex === activeIndex);
                    card.tabIndex = 0;
                    row.appendChild(card);
                });

                track.appendChild(row);
            }

            if (!cards.length) {
                const row = document.createElement('div');
                row.className = 'slide7-hand__row';
                row.style.setProperty('--n', '1');
                track.appendChild(row);
            }
        }

        const canNav = cards.length > 1;
        if (prev) prev.disabled = !canNav;
        if (next) next.disabled = !canNav;
        if (nav) nav.hidden = !canNav;

        this.updateResultsCounter(kind, cards, activeIndex);
    }

    selectResultsCard(kind, index) {
        const cards = this.getResultsCards(kind);
        if (!cards.length) return;
        const nextIndex = ((index % cards.length) + cards.length) % cards.length;
        this.resultsHandIndex[kind] = nextIndex;

        if (this.isResultsMobileLayout()) {
            const track = this.getResultsTrack(kind);
            const stack = track?.querySelector(':scope > .slide7-hand__stack');
            const stackedCards = stack ? [...stack.querySelectorAll('.slide7-result-card')] : [];
            if (stack && stackedCards.length === cards.length) {
                this.applyResultsMobileStackClasses(stackedCards, nextIndex);
                this.updateResultsCounter(kind, stackedCards, nextIndex);
                return;
            }
            this.syncResultsStack(kind);
            return;
        }

        cards.forEach((card, cardIndex) => {
            card.classList.toggle('is-active', cardIndex === nextIndex);
        });

        this.updateResultsCounter(kind, cards, nextIndex);
    }

    stepResultsHand(kind, direction) {
        const cards = this.getResultsCards(kind);
        if (cards.length <= 1) return;
        const current = this.resultsHandIndex?.[kind] || 0;
        this.selectResultsCard(kind, current + direction);
    }

    bindResultsHand(kind) {
        const track = this.getResultsTrack(kind);
        if (!track || track.dataset.handBound === 'true') return;
        track.dataset.handBound = 'true';

        track.addEventListener('click', (event) => {
            const card = event.target.closest('.slide7-result-card');
            if (!card || !track.contains(card)) return;
            const cards = this.getResultsCards(kind);
            const index = cards.indexOf(card);
            if (index < 0) return;
            this.selectResultsCard(kind, index);
        });

        track.addEventListener('keydown', (event) => {
            const card = event.target.closest('.slide7-result-card');
            if (!card || !track.contains(card)) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const cards = this.getResultsCards(kind);
                const index = cards.indexOf(card);
                if (index >= 0) this.selectResultsCard(kind, index);
            }
        });

        if (!this.resultsResizeBound) {
            this.resultsResizeBound = true;
            let resizeTimer = null;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => {
                    this.syncResultsStack('event');
                    this.syncResultsStack('role');
                }, 150);
            });
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