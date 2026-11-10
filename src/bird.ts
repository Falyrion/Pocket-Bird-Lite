import { Directions, getLayerPixels, getWindowHeight, getFixedWindowHeight, type Direction, type Palette, type PixelGrid } from "./util.ts";
import Layer from "./animation/layer.ts";
import Frame from "./animation/frame.ts";
import Anim from "./animation/anim.ts";
import { createHatLayers, type HatId, type HatLayers } from "./hats.ts";

const SPRITE_SIZE = 32;
const CANVAS_PIXEL_SIZE = 1;

export const Animations = {
	STILL: "STILL",
	BOB: "BOB",
	FLYING: "FLYING",
	HEART: "HEART"
} as const;

export type AnimationType = keyof typeof Animations;

/**
 * The bird's canvas, sprites and animations. Movement is handled by behavior.ts.
 */
export class Bird {
	readonly canvas: HTMLCanvasElement;
	readonly #ctx: CanvasRenderingContext2D;
	readonly #layers: BirdLayers;
	readonly #hatSheet: PixelGrid;
	#palette: Palette;
	#tags: readonly string[];
	#animations: Record<AnimationType, Anim>;

	#animStart = Date.now();
	#currentAnimation: AnimationType = Animations.STILL;
	#direction: Direction = Directions.RIGHT;
	#y = 0;
	#isAbsolutePositioned = false;
	#visible = true;

	/**
	 * @param root Where to attach the canvas
	 * @param birdSheet Decoded bird sprite sheet
	 * @param hatSheet Decoded hat sprite sheet
	 * @param palette Species colour palette
	 * @param speciesTags Species tags (e.g. "tuft")
	 * @param hatId Hat to wear
	 */
	constructor(root: ShadowRoot, birdSheet: PixelGrid, hatSheet: PixelGrid, palette: Palette, speciesTags: readonly string[], hatId: HatId) {
		this.#layers = createBirdLayers(birdSheet);
		this.#hatSheet = hatSheet;
		this.#palette = palette;
		this.#tags = [...speciesTags, hatId];
		this.#animations = createAnimations(this.#layers, createHatLayers(hatSheet, hatId));

		this.canvas = document.createElement("canvas");
		this.canvas.id = "birb";
		this.canvas.width = SPRITE_SIZE * CANVAS_PIXEL_SIZE;
		this.canvas.height = SPRITE_SIZE * CANVAS_PIXEL_SIZE;
		const ctx = this.canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Pocket Bird: canvas 2D context unavailable");
		}
		this.#ctx = ctx;

		root.appendChild(this.canvas);
	}

	/**
	 * Change species and hat in place. The current animation keeps playing and is redrawn on the next frame.
	 */
	setAppearance(palette: Palette, speciesTags: readonly string[], hatId: HatId): void {
		this.#palette = palette;
		this.#tags = [...speciesTags, hatId];
		// New Anim instances have no cached frame, so the next draw() repaints
		this.#animations = createAnimations(this.#layers, createHatLayers(this.#hatSheet, hatId));
	}

	/**
	 * Draw the current animation frame
	 * @returns Whether the animation has completed (for non-looping animations)
	 */
	draw(): boolean {
		const anim = this.#animations[this.#currentAnimation];
		return anim.draw(this.#ctx, this.#direction, this.#animStart, CANVAS_PIXEL_SIZE, this.#palette, this.#tags);
	}

	getCurrentAnimation(): AnimationType {
		return this.#currentAnimation;
	}

	/**
	 * Set the current animation and reset the animation timer
	 */
	setAnimation(animation: AnimationType): void {
		this.#currentAnimation = animation;
		this.#animStart = Date.now();
	}

	setX(x: number): void {
		this.canvas.style.left = `${x - this.canvas.width / 2 - (this.#direction === Directions.RIGHT ? 2 : -2)}px`;
	}

	/**
	 * @param y Distance from the bottom of the window
	 */
	setY(y: number): void {
		this.#y = y;
		let bottom;
		if (this.#isAbsolutePositioned) {
			// Position is absolute, convert from fixed
			// Account for address bar shrinkage on iOS
			bottom = y - window.scrollY - (getWindowHeight() - getFixedWindowHeight());
		} else {
			// Position is fixed
			bottom = y;
		}
		this.canvas.style.bottom = `${bottom}px`;
	}

	setDirection(direction: Direction): void {
		this.#direction = direction;
	}

	/**
	 * Absolute positioning keeps the bird attached to the element while the page scrolls
	 */
	setAbsolutePositioned(absolute: boolean): void {
		this.#isAbsolutePositioned = absolute;
		this.canvas.classList.toggle("birb-absolute", absolute);
		this.setY(this.#y);
	}

	setVisible(visible: boolean): void {
		this.#visible = visible;
		this.canvas.style.display = visible ? "" : "none";
	}

	isVisible(): boolean {
		return this.#visible;
	}
}

type BirdLayers = ReturnType<typeof createBirdLayers>;

/**
 * Cut the individual sprites out of the bird sheet
 */
function createBirdLayers(birdSheet: PixelGrid) {
	/**
	 * @param index Sprite index in the bird sheet
	 * @param tag Only include this layer when the tag is active
	 */
	const layer = (index: number, tag?: string) => new Layer(getLayerPixels(birdSheet, index, SPRITE_SIZE), tag);
	return {
		base: layer(0),
		down: layer(1),
		heartOne: layer(2),
		heartTwo: layer(3),
		heartThree: layer(4),
		tuftBase: layer(5, "tuft"),
		tuftDown: layer(6, "tuft"),
		wingsUp: layer(7),
		wingsDown: layer(8),
		happyEye: layer(9),
	};
}

/**
 * Combine the bird and hat layers into frames and animations
 */
function createAnimations(layers: BirdLayers, hat: HatLayers): Record<AnimationType, Anim> {
	const frames = {
		base: new Frame([layers.base, layers.tuftBase, ...hat.base]),
		headDown: new Frame([layers.down, layers.tuftDown, ...hat.down]),
		wingsDown: new Frame([layers.base, layers.tuftBase, layers.wingsDown, ...hat.base]),
		wingsUp: new Frame([layers.down, layers.tuftDown, layers.wingsUp, ...hat.down]),
		heartOne: new Frame([layers.base, layers.tuftBase, layers.happyEye, ...hat.base, layers.heartOne]),
		heartTwo: new Frame([layers.base, layers.tuftBase, layers.happyEye, ...hat.base, layers.heartTwo]),
		heartThree: new Frame([layers.base, layers.tuftBase, layers.happyEye, ...hat.base, layers.heartThree]),
	};

	return {
		STILL: new Anim([frames.base], [1000]),
		BOB: new Anim(
			[frames.base, frames.headDown],
			[420, 420]
		),
		FLYING: new Anim(
			[frames.base, frames.wingsUp, frames.headDown, frames.wingsDown],
			[30, 80, 30, 60]
		),
		HEART: new Anim(
			[
				frames.heartOne,
				frames.heartTwo,
				frames.heartThree,
				frames.heartTwo,
				frames.heartThree,
				frames.heartTwo,
				frames.heartThree,
				frames.heartTwo,
			],
			[60, 80, 250, 250, 250, 250, 250, 250],
			false
		),
	};
}
