import { Animations } from "./bird.js";
import { Directions, getWindowHeight, isMobile } from "./util.js";

/** @typedef {import('./bird.js').Bird} Bird */

/**
 * @typedef {Object} BehaviorOptions
 * @property {string[]} landingSelectors CSS selectors for elements the bird can land on
 * @property {number} landingTopMargin Ignore elements whose top is closer than this to the top of the window
 * @property {number} landingMinWidth Ignore elements narrower than this
 */

// Movement
const HOP_SPEED = 0.07;
const FLY_SPEED = 0.25;
const FLY_SPEED_MOBILE = 0.175;
const HOP_DISTANCE = 35;

// Timing (in milliseconds)
const UPDATE_INTERVAL = 1000 / 60; // 60 FPS
const AFK_TIME = 1000 * 5;
const HOP_DELAY = 500;

// Random event chances per update tick
const HOP_CHANCE = 1 / (60 * 2.5); // Every 2.5 seconds
const FOCUS_SWITCH_CHANCE = 1 / (60 * 20); // Every 20 seconds

// Petting: this many mouseovers within PET_WINDOW triggers the heart animation
const PET_HOVERS = 3;
const PET_WINDOW = 1000;

const States = /** @type {const} */ ({
	IDLE: "idle",
	HOP: "hop",
	FLYING: "flying",
});

/**
 * Moves the bird around: idling, hopping, flying between elements, and petting.
 */
export class BirdBehavior {
	/** @type {typeof States[keyof typeof States]} */
	currentState = States.IDLE;
	stateStart = Date.now();
	// Bird's current position (x from left, y from bottom of window)
	birdX = 40;
	birdY = 0;
	// Bird's starting position (when flying or hopping)
	startX = 0;
	startY = 0;
	// Bird's target position (when flying or hopping)
	targetX = 0;
	targetY = 0;
	/** @type {HTMLElement|null} */
	focusedElement = null;
	focusedBounds = { left: 0, right: 0, top: 0 };
	lastActionTimestamp = Date.now();
	/** @type {number[]} */
	petStack = [];

	/** @type {ReturnType<typeof setInterval>|undefined} */
	updateTimer;
	/** @type {number|undefined} */
	frameRequest;
	/** @type {AbortController|undefined} */
	listeners;

	/**
	 * @param {Bird} bird
	 * @param {BehaviorOptions} options
	 */
	constructor(bird, options) {
		this.bird = bird;
		this.options = options;
		this.flySpeed = isMobile() ? FLY_SPEED_MOBILE : FLY_SPEED;
	}

	start() {
		this.listeners = new AbortController();
		const { signal } = this.listeners;
		const birdElement = this.bird.getElement();

		const onUserAction = () => {
			this.lastActionTimestamp = Date.now();
		};
		window.addEventListener("scroll", onUserAction, { signal, passive: true });
		document.addEventListener("click", onUserAction, { signal });

		birdElement.addEventListener("mouseover", () => {
			this.lastActionTimestamp = Date.now();
			if (this.currentState !== States.IDLE) {
				return;
			}
			const now = Date.now();
			this.petStack = this.petStack.filter((time) => now - time < PET_WINDOW);
			this.petStack.push(now);
			if (this.petStack.length >= PET_HOVERS) {
				this.pet();
				this.petStack = [];
			}
		}, { signal });

		birdElement.addEventListener("touchmove", () => this.pet(), { signal, passive: true });

		this.bird.setAnimation(Animations.BOB);
		this.flyToElement(true);

		this.updateTimer = setInterval(() => this.update(), UPDATE_INTERVAL);
		const drawLoop = () => {
			this.frameRequest = requestAnimationFrame(drawLoop);
			this.draw();
		};
		drawLoop();
	}

	stop() {
		this.listeners?.abort();
		clearInterval(this.updateTimer);
		if (this.frameRequest !== undefined) {
			cancelAnimationFrame(this.frameRequest);
		}
	}

	/**
	 * Logic tick, runs at a fixed rate
	 */
	update() {
		// Hide the bird while the page is fullscreen
		const shouldBeVisible = !document.fullscreenElement;
		if (this.bird.isVisible() !== shouldBeVisible) {
			this.bird.setVisible(shouldBeVisible);
		}

		if (this.currentState === States.IDLE) {
			if (Date.now() - this.stateStart > HOP_DELAY && Math.random() < HOP_CHANCE && this.bird.getCurrentAnimation() !== Animations.HEART) {
				this.hop();
			} else if (Date.now() - this.lastActionTimestamp > AFK_TIME) {
				// Idle for a while, do something
				if (this.focusedElement === null || Math.random() < FOCUS_SWITCH_CHANCE) {
					this.flyToElement();
					this.lastActionTimestamp = Date.now();
				}
			}
		} else if (this.currentState === States.HOP) {
			if (this.updateParabolicPath(HOP_SPEED)) {
				this.setState(States.IDLE);
			}
		}
	}

	/**
	 * Render tick, runs every animation frame
	 */
	draw() {
		if (!this.bird.isVisible()) {
			return;
		}

		// The element the bird is on was removed or hidden (e.g. after a route change)
		if (this.focusedElement && this.focusedElement.getClientRects().length === 0) {
			this.flyToElement();
		}

		this.updateFocusedElementBounds();

		if (this.currentState === States.IDLE) {
			if (this.focusedElement && !this.isWithinHorizontalBounds()) {
				this.flyToElement();
			}
			this.birdY = this.getFocusedY();
		} else if (this.currentState === States.FLYING) {
			// Fly to target location (even if in the air)
			if (this.updateParabolicPath(this.flySpeed, 2)) {
				this.setState(States.IDLE);
			}
		}

		const oldTargetY = this.targetY;
		this.targetY = this.getFocusedY();
		// Adjust startY to account for scrolling
		this.startY += this.targetY - oldTargetY;
		if (this.targetY < 0 || this.targetY > getWindowHeight()) {
			// Fly to another element or the ground if the focused element moves out of bounds
			this.flyToElement();
		}

		if (this.bird.draw()) {
			// Non-looping animation (petting) finished
			this.bird.setAnimation(Animations.STILL);
		}

		// Clamp startY, birdY, targetY to a bit above the top of the window
		const maxY = getWindowHeight() * 1.5;
		this.startY = Math.min(this.startY, maxY);
		this.birdY = Math.min(this.birdY, maxY);
		this.targetY = Math.min(this.targetY, maxY);

		this.bird.setX(this.birdX);
		this.bird.setY(this.birdY);
	}

	pet() {
		if (this.currentState === States.IDLE && this.bird.getCurrentAnimation() !== Animations.HEART) {
			this.bird.setAnimation(Animations.HEART);
		}
	}

	hop() {
		if (this.currentState !== States.IDLE) {
			return;
		}
		this.setState(States.HOP);
		this.bird.setAnimation(Animations.FLYING);
		const { left, right } = this.focusedBounds;
		if ((Math.random() < 0.5 && this.birdX - HOP_DISTANCE > left) || this.birdX + HOP_DISTANCE > right) {
			this.targetX = this.birdX - HOP_DISTANCE;
		} else {
			this.targetX = this.birdX + HOP_DISTANCE;
		}
		this.targetY = this.getFocusedY();
	}

	/**
	 * Pick a random element in the viewport and fly to it (or to the ground if there is none)
	 * @param {boolean} [teleport] Whether to teleport to the element instead of flying
	 */
	flyToElement(teleport = false) {
		const previousElement = this.focusedElement;
		this.focusedElement = this.getRandomValidElement();
		this.updateFocusedElementBounds();
		const x = this.getFocusedElementRandomX();
		const y = this.getFocusedY();
		if (teleport) {
			this.birdX = x;
			this.birdY = y;
			this.setState(States.IDLE);
		} else if (this.focusedElement !== previousElement) {
			this.targetX = x;
			this.targetY = y;
			this.setState(States.FLYING);
			this.bird.setAnimation(Animations.FLYING);
		}
	}

	/**
	 * @returns {HTMLElement|null} A random visible element to land on, or null if none was found
	 */
	getRandomValidElement() {
		const { landingSelectors, landingTopMargin, landingMinWidth } = this.options;
		if (landingSelectors.length === 0) {
			return null;
		}
		const candidates = Array.from(document.querySelectorAll(landingSelectors.join(", "))).filter((element) => {
			if (!(element instanceof HTMLElement) || element === this.focusedElement) {
				return false;
			}
			const rect = element.getBoundingClientRect();
			const inWindow = rect.left >= 0 && rect.top >= landingTopMargin && rect.right <= window.innerWidth && rect.top <= getWindowHeight();
			if (!inWindow || element.offsetWidth < landingMinWidth) {
				return false;
			}
			const style = window.getComputedStyle(element);
			return style.display !== "none" && style.visibility !== "hidden" && !(style.opacity && parseFloat(style.opacity) < 0.25);
		});
		if (candidates.length === 0) {
			return null;
		}
		return /** @type {HTMLElement} */ (candidates[Math.floor(Math.random() * candidates.length)]);
	}

	updateFocusedElementBounds() {
		if (this.focusedElement === null) {
			// The ground is the bottom of the window
			this.focusedBounds = { left: 0, right: window.innerWidth, top: getWindowHeight() };
			return;
		}
		const { left, right, top } = this.focusedElement.getBoundingClientRect();
		this.focusedBounds = { left, right, top };
	}

	getFocusedElementRandomX() {
		const { left, right } = this.focusedBounds;
		return Math.random() * (right - left) + left;
	}

	isWithinHorizontalBounds() {
		return this.birdX >= this.focusedBounds.left && this.birdX <= this.focusedBounds.right;
	}

	getFocusedY() {
		return getWindowHeight() - this.focusedBounds.top;
	}

	/**
	 * Move the bird from the start to the target location along a parabolic path
	 * @param {number} speed The speed of the bird along the path
	 * @param {number} [intensity] The intensity of the parabolic path
	 * @returns {boolean} Whether the bird has reached the target location
	 */
	updateParabolicPath(speed, intensity = 2.5) {
		const dx = this.targetX - this.startX;
		const dy = this.targetY - this.startY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const time = Date.now() - this.stateStart;
		if (distance > Math.max(window.innerWidth, getWindowHeight()) / 2) {
			speed *= 1.3;
		}
		const amount = Math.min(1, time / (distance / speed));
		const { x, y } = parabolicLerp(this.startX, this.startY, this.targetX, this.targetY, amount, intensity);
		this.birdX = x;
		this.birdY = y;
		const complete = Math.abs(this.birdX - this.targetX) < 1 && Math.abs(this.birdY - this.targetY) < 1;
		if (complete) {
			this.birdX = this.targetX;
			this.birdY = this.targetY;
		} else {
			this.bird.setDirection(this.targetX > this.birdX ? Directions.RIGHT : Directions.LEFT);
		}
		return complete;
	}

	/**
	 * Set the current state and reset the state timer
	 * @param {typeof States[keyof typeof States]} state
	 */
	setState(state) {
		this.stateStart = Date.now();
		this.startX = this.birdX;
		this.startY = this.birdY;
		this.currentState = state;
		if (state === States.IDLE) {
			this.bird.setAnimation(Animations.BOB);
		}
		// Stick to the element while sitting on it so it follows page scrolling
		const isAbsolute = this.focusedElement !== null && (state === States.IDLE || state === States.HOP);
		this.bird.setAbsolutePositioned(isAbsolute);
		this.bird.setY(this.birdY);
	}
}

/**
 * Point along a quadratic curve that arcs between start and end
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {number} amount Progress from 0 to 1
 * @param {number} [intensity] How high the arc goes
 * @returns {{x: number, y: number}}
 */
function parabolicLerp(startX, startY, endX, endY, amount, intensity = 1.2) {
	const dx = endX - startX;
	const dy = endY - startY;
	const distance = Math.sqrt(dx * dx + dy * dy);
	const angle = Math.atan2(dy, dx);
	const midX = startX + Math.cos(angle) * distance / 2;
	const midY = startY + Math.sin(angle) * distance / 2 + distance / 4 * intensity;
	const t = amount;
	const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * midX + t ** 2 * endX;
	const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * midY + t ** 2 * endY;
	return { x, y };
}
