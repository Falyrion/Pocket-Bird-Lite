import { Animations, type Bird } from "./bird.ts";
import { Directions, getWindowHeight, isMobile } from "./util.ts";

export interface BehaviorOptions {
	/** CSS selectors for elements the bird lands on the top edge of */
	landingSelectors: readonly string[];
	/** CSS selectors for elements the bird lands on the first line of text of */
	textLandingSelectors: readonly string[];
	/** Ignore elements whose top is closer than this to the top of the window */
	landingTopMargin: number;
	/** Ignore elements narrower than this */
	landingMinWidth: number;
}

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

const States = {
	IDLE: "idle",
	HOP: "hop",
	FLYING: "flying",
} as const;

type State = typeof States[keyof typeof States];

/** The surface the bird stands on, in viewport coordinates */
interface LandingBounds {
	left: number;
	right: number;
	top: number;
}

interface LandingTarget {
	element: HTMLElement;
	/** Land on the first line of text instead of the element's top edge */
	isText: boolean;
}

/**
 * Moves the bird around: idling, hopping, flying between elements, and petting.
 */
export class BirdBehavior {
	readonly #bird: Bird;
	#options: BehaviorOptions;
	readonly #flySpeed: number;

	#currentState: State = States.IDLE;
	#stateStart = Date.now();
	// Bird's current position (x from left, y from bottom of window)
	#birdX = 40;
	#birdY = 0;
	// Bird's starting position (when flying or hopping)
	#startX = 0;
	#startY = 0;
	// Bird's target position (when flying or hopping)
	#targetX = 0;
	#targetY = 0;
	#focusedElement: HTMLElement | null = null;
	#focusedIsText = false;
	#focusedBounds: LandingBounds = { left: 0, right: 0, top: 0 };
	#lastActionTimestamp = Date.now();
	#petStack: number[] = [];

	#updateTimer: ReturnType<typeof setInterval> | undefined;
	#frameRequest: number | undefined;
	#listeners: AbortController | undefined;

	constructor(bird: Bird, options: BehaviorOptions) {
		this.#bird = bird;
		this.#options = options;
		this.#flySpeed = isMobile() ? FLY_SPEED_MOBILE : FLY_SPEED;
	}

	start(): void {
		this.#listeners = new AbortController();
		const { signal } = this.#listeners;
		const birdElement = this.#bird.canvas;

		const onUserAction = () => {
			this.#lastActionTimestamp = Date.now();
		};
		window.addEventListener("scroll", onUserAction, { signal, passive: true });
		document.addEventListener("click", onUserAction, { signal });

		birdElement.addEventListener("mouseover", () => {
			this.#lastActionTimestamp = Date.now();
			if (this.#currentState !== States.IDLE) {
				return;
			}
			const now = Date.now();
			this.#petStack = this.#petStack.filter((time) => now - time < PET_WINDOW);
			this.#petStack.push(now);
			if (this.#petStack.length >= PET_HOVERS) {
				this.pet();
				this.#petStack = [];
			}
		}, { signal });

		birdElement.addEventListener("touchmove", () => this.pet(), { signal, passive: true });

		this.#bird.setAnimation(Animations.BOB);
		this.#flyToElement(true);

		this.#updateTimer = setInterval(() => this.#update(), UPDATE_INTERVAL);
		const drawLoop = () => {
			this.#frameRequest = requestAnimationFrame(drawLoop);
			this.#draw();
		};
		drawLoop();
	}

	stop(): void {
		this.#listeners?.abort();
		clearInterval(this.#updateTimer);
		if (this.#frameRequest !== undefined) {
			cancelAnimationFrame(this.#frameRequest);
		}
	}

	/**
	 * Change landing options. They apply the next time the bird picks somewhere to land.
	 */
	setOptions(options: BehaviorOptions): void {
		this.#options = options;
	}

	pet(): void {
		if (this.#currentState === States.IDLE && this.#bird.getCurrentAnimation() !== Animations.HEART) {
			this.#bird.setAnimation(Animations.HEART);
		}
	}

	/**
	 * Logic tick, runs at a fixed rate
	 */
	#update(): void {
		// Hide the bird while the page is fullscreen
		const shouldBeVisible = !document.fullscreenElement;
		if (this.#bird.isVisible() !== shouldBeVisible) {
			this.#bird.setVisible(shouldBeVisible);
		}

		if (this.#currentState === States.IDLE) {
			if (Date.now() - this.#stateStart > HOP_DELAY && Math.random() < HOP_CHANCE && this.#bird.getCurrentAnimation() !== Animations.HEART) {
				this.#hop();
			} else if (Date.now() - this.#lastActionTimestamp > AFK_TIME) {
				// Idle for a while, do something
				if (this.#focusedElement === null || Math.random() < FOCUS_SWITCH_CHANCE) {
					this.#flyToElement();
					this.#lastActionTimestamp = Date.now();
				}
			}
		} else if (this.#currentState === States.HOP) {
			if (this.#updateParabolicPath(HOP_SPEED)) {
				this.#setState(States.IDLE);
			}
		}
	}

	/**
	 * Render tick, runs every animation frame
	 */
	#draw(): void {
		if (!this.#bird.isVisible()) {
			return;
		}

		// The element the bird is on was removed or hidden (e.g. after a route change)
		if (this.#focusedElement && this.#focusedElement.getClientRects().length === 0) {
			this.#flyToElement();
		}

		this.#updateFocusedElementBounds();

		if (this.#currentState === States.IDLE) {
			if (this.#focusedElement && !this.#isWithinHorizontalBounds()) {
				this.#flyToElement();
			}
			this.#birdY = this.#getFocusedY();
		} else if (this.#currentState === States.FLYING) {
			// Fly to target location (even if in the air)
			if (this.#updateParabolicPath(this.#flySpeed, 2)) {
				this.#setState(States.IDLE);
			}
		}

		const oldTargetY = this.#targetY;
		this.#targetY = this.#getFocusedY();
		// Adjust startY to account for scrolling
		this.#startY += this.#targetY - oldTargetY;
		if (this.#targetY < 0 || this.#targetY > getWindowHeight()) {
			// Fly to another element or the ground if the focused element moves out of bounds
			this.#flyToElement();
		}

		if (this.#bird.draw()) {
			// Non-looping animation (petting) finished
			this.#bird.setAnimation(Animations.STILL);
		}

		// Clamp startY, birdY, targetY to a bit above the top of the window
		const maxY = getWindowHeight() * 1.5;
		this.#startY = Math.min(this.#startY, maxY);
		this.#birdY = Math.min(this.#birdY, maxY);
		this.#targetY = Math.min(this.#targetY, maxY);

		this.#bird.setX(this.#birdX);
		this.#bird.setY(this.#birdY);
	}

	#hop(): void {
		if (this.#currentState !== States.IDLE) {
			return;
		}
		this.#setState(States.HOP);
		this.#bird.setAnimation(Animations.FLYING);
		const { left, right } = this.#focusedBounds;
		if ((Math.random() < 0.5 && this.#birdX - HOP_DISTANCE > left) || this.#birdX + HOP_DISTANCE > right) {
			this.#targetX = this.#birdX - HOP_DISTANCE;
		} else {
			this.#targetX = this.#birdX + HOP_DISTANCE;
		}
		this.#targetY = this.#getFocusedY();
	}

	/**
	 * Pick a random element in the viewport and fly to it (or to the ground if there is none)
	 * @param teleport Whether to teleport to the element instead of flying
	 */
	#flyToElement(teleport = false): void {
		const previousElement = this.#focusedElement;
		const target = this.#getRandomLandingTarget();
		this.#focusedElement = target?.element ?? null;
		this.#focusedIsText = target?.isText ?? false;
		this.#updateFocusedElementBounds();
		const x = this.#getFocusedElementRandomX();
		const y = this.#getFocusedY();
		if (teleport) {
			this.#birdX = x;
			this.#birdY = y;
			this.#setState(States.IDLE);
		} else if (this.#focusedElement !== previousElement) {
			this.#targetX = x;
			this.#targetY = y;
			this.#setState(States.FLYING);
			this.#bird.setAnimation(Animations.FLYING);
		}
	}

	/**
	 * @returns A random visible element to land on, or null if none was found
	 */
	#getRandomLandingTarget(): LandingTarget | null {
		const { landingSelectors, textLandingSelectors, landingTopMargin, landingMinWidth } = this.#options;

		// Element -> isText; text wins if an element matches both lists
		const targets = new Map<HTMLElement, boolean>();
		const collect = (selectors: readonly string[], isText: boolean) => {
			if (selectors.length === 0) {
				return;
			}
			for (const element of document.querySelectorAll(selectors.join(", "))) {
				if (element instanceof HTMLElement) {
					targets.set(element, isText);
				}
			}
		};
		collect(landingSelectors, false);
		collect(textLandingSelectors, true);

		const windowHeight = getWindowHeight();
		const candidates: LandingTarget[] = [];
		for (const [element, isText] of targets) {
			if (element === this.#focusedElement) {
				continue;
			}
			// Cheap check on the element's box before measuring its text
			const box = element.getBoundingClientRect();
			if (box.bottom < landingTopMargin || box.top > windowHeight) {
				continue;
			}
			const bounds = getLandingBounds(element, isText);
			const inWindow = bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.top >= landingTopMargin && bounds.top <= windowHeight;
			if (!inWindow || bounds.right - bounds.left < landingMinWidth) {
				continue;
			}
			const style = window.getComputedStyle(element);
			if (style.display === "none" || style.visibility === "hidden" || (style.opacity && parseFloat(style.opacity) < 0.25)) {
				continue;
			}
			candidates.push({ element, isText });
		}
		if (candidates.length === 0) {
			return null;
		}
		return candidates[Math.floor(Math.random() * candidates.length)];
	}

	#updateFocusedElementBounds(): void {
		if (this.#focusedElement === null) {
			// The ground is the bottom of the window
			this.#focusedBounds = { left: 0, right: window.innerWidth, top: getWindowHeight() };
			return;
		}
		this.#focusedBounds = getLandingBounds(this.#focusedElement, this.#focusedIsText);
	}

	#getFocusedElementRandomX(): number {
		const { left, right } = this.#focusedBounds;
		return Math.random() * (right - left) + left;
	}

	#isWithinHorizontalBounds(): boolean {
		return this.#birdX >= this.#focusedBounds.left && this.#birdX <= this.#focusedBounds.right;
	}

	#getFocusedY(): number {
		return getWindowHeight() - this.#focusedBounds.top;
	}

	/**
	 * Move the bird from the start to the target location along a parabolic path
	 * @param speed The speed of the bird along the path
	 * @param intensity The intensity of the parabolic path
	 * @returns Whether the bird has reached the target location
	 */
	#updateParabolicPath(speed: number, intensity = 2.5): boolean {
		const dx = this.#targetX - this.#startX;
		const dy = this.#targetY - this.#startY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const time = Date.now() - this.#stateStart;
		if (distance > Math.max(window.innerWidth, getWindowHeight()) / 2) {
			speed *= 1.3;
		}
		const amount = Math.min(1, time / (distance / speed));
		const { x, y } = parabolicLerp(this.#startX, this.#startY, this.#targetX, this.#targetY, amount, intensity);
		this.#birdX = x;
		this.#birdY = y;
		const complete = Math.abs(this.#birdX - this.#targetX) < 1 && Math.abs(this.#birdY - this.#targetY) < 1;
		if (complete) {
			this.#birdX = this.#targetX;
			this.#birdY = this.#targetY;
		} else {
			this.#bird.setDirection(this.#targetX > this.#birdX ? Directions.RIGHT : Directions.LEFT);
		}
		return complete;
	}

	/**
	 * Set the current state and reset the state timer
	 */
	#setState(state: State): void {
		this.#stateStart = Date.now();
		this.#startX = this.#birdX;
		this.#startY = this.#birdY;
		this.#currentState = state;
		if (state === States.IDLE) {
			this.#bird.setAnimation(Animations.BOB);
		}
		// Stick to the element while sitting on it so it follows page scrolling
		const isAbsolute = this.#focusedElement !== null && (state === States.IDLE || state === States.HOP);
		this.#bird.setAbsolutePositioned(isAbsolute);
		this.#bird.setY(this.#birdY);
	}
}

/**
 * Where the bird stands on an element: the first line of text for text targets
 * (falling back to the element's box if it has no visible text), otherwise the top edge of the box
 */
function getLandingBounds(element: HTMLElement, isText: boolean): LandingBounds {
	if (isText) {
		const line = getFirstLineBounds(element);
		if (line) {
			return line;
		}
	}
	const { left, right, top } = element.getBoundingClientRect();
	return { left, right, top };
}

/**
 * Bounds of the first rendered line of text inside an element
 * @returns null if the element has no visible text
 */
function getFirstLineBounds(element: HTMLElement): LandingBounds | null {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const range = document.createRange();
	let line: LandingBounds | null = null;
	let lineTop = 0;
	let lineBottom = 0;
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (!/\S/.test(node.nodeValue ?? "")) {
			continue;
		}
		range.selectNodeContents(node);
		for (const rect of range.getClientRects()) {
			if (rect.width === 0 || rect.height === 0) {
				continue;
			}
			if (line === null) {
				line = { left: rect.left, right: rect.right, top: rect.top };
				lineTop = rect.top;
				lineBottom = rect.bottom;
				continue;
			}
			const center = (rect.top + rect.bottom) / 2;
			if (center < lineTop || center > lineBottom) {
				// Reached the second line
				return line;
			}
			// Another piece of the first line (e.g. a link or bold text)
			line.left = Math.min(line.left, rect.left);
			line.right = Math.max(line.right, rect.right);
			line.top = Math.min(line.top, rect.top);
		}
	}
	return line;
}

/**
 * Point along a quadratic curve that arcs between start and end
 * @param amount Progress from 0 to 1
 * @param intensity How high the arc goes
 */
function parabolicLerp(startX: number, startY: number, endX: number, endY: number, amount: number, intensity = 1.2): { x: number, y: number } {
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
