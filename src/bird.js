import { Directions, getLayerPixels, getWindowHeight, getFixedWindowHeight } from "./util.js";
import Layer from "./animation/layer.js";
import Frame from "./animation/frame.js";
import Anim from "./animation/anim.js";
import { createHatLayers } from "./hats.js";

const SPRITE_SIZE = 32;
const CANVAS_PIXEL_SIZE = 1;

/**
 * @typedef {keyof typeof Animations} AnimationType
 */

export const Animations = /** @type {const} */ ({
	STILL: "STILL",
	BOB: "BOB",
	FLYING: "FLYING",
	HEART: "HEART"
});

/**
 * The bird's canvas, sprites and animations. Movement is handled by behavior.js.
 */
export class Bird {
	animStart = Date.now();
	x = 0;
	y = 0;
	/** @type {number} */
	direction = Directions.RIGHT;
	isAbsolutePositioned = false;
	visible = true;
	/** @type {AnimationType} */
	currentAnimation = Animations.STILL;

	/**
	 * @param {ShadowRoot} root Where to attach the canvas
	 * @param {string[][]} birdSheet Decoded bird sprite sheet
	 * @param {string[][]} hatSheet Decoded hat sprite sheet
	 * @param {Record<string, string>} palette Species colour palette
	 * @param {string[]} speciesTags Species tags (e.g. "tuft")
	 * @param {string} hatId Hat to wear
	 */
	constructor(root, birdSheet, hatSheet, palette, speciesTags, hatId) {
		this.palette = palette;
		this.tags = [...speciesTags, hatId];

		/**
		 * @param {number} index Sprite index in the bird sheet
		 * @param {string} [tag] Only include this layer when the tag is active
		 */
		const layer = (index, tag) => new Layer(getLayerPixels(birdSheet, index, SPRITE_SIZE), tag);

		const layers = {
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

		const hat = createHatLayers(hatSheet, hatId);

		const frames = {
			base: new Frame([layers.base, layers.tuftBase, ...hat.base]),
			headDown: new Frame([layers.down, layers.tuftDown, ...hat.down]),
			wingsDown: new Frame([layers.base, layers.tuftBase, layers.wingsDown, ...hat.base]),
			wingsUp: new Frame([layers.down, layers.tuftDown, layers.wingsUp, ...hat.down]),
			heartOne: new Frame([layers.base, layers.tuftBase, layers.happyEye, ...hat.base, layers.heartOne]),
			heartTwo: new Frame([layers.base, layers.tuftBase, layers.happyEye, ...hat.base, layers.heartTwo]),
			heartThree: new Frame([layers.base, layers.tuftBase, layers.happyEye, ...hat.base, layers.heartThree]),
		};

		/** @type {Record<AnimationType, Anim>} */
		this.animations = {
			[Animations.STILL]: new Anim([frames.base], [1000]),
			[Animations.BOB]: new Anim([
				frames.base,
				frames.headDown
			], [
				420,
				420
			]),
			[Animations.FLYING]: new Anim([
				frames.base,
				frames.wingsUp,
				frames.headDown,
				frames.wingsDown,
			], [
				30,
				80,
				30,
				60,
			]),
			[Animations.HEART]: new Anim([
				frames.heartOne,
				frames.heartTwo,
				frames.heartThree,
				frames.heartTwo,
				frames.heartThree,
				frames.heartTwo,
				frames.heartThree,
				frames.heartTwo,
			], [
				60,
				80,
				250,
				250,
				250,
				250,
				250,
				250,
			], false),
		};

		this.canvas = document.createElement("canvas");
		this.canvas.id = "birb";
		this.canvas.width = frames.base.getPixels()[0].length * CANVAS_PIXEL_SIZE;
		this.canvas.height = SPRITE_SIZE * CANVAS_PIXEL_SIZE;
		this.ctx = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext("2d"));

		root.appendChild(this.canvas);
	}

	/**
	 * Draw the current animation frame
	 * @returns {boolean} Whether the animation has completed (for non-looping animations)
	 */
	draw() {
		const anim = this.animations[this.currentAnimation];
		return anim.draw(this.ctx, this.direction, this.animStart, CANVAS_PIXEL_SIZE, this.palette, this.tags);
	}

	/**
	 * @returns {AnimationType} The current animation key
	 */
	getCurrentAnimation() {
		return this.currentAnimation;
	}

	/**
	 * Set the current animation and reset the animation timer
	 * @param {AnimationType} animationName
	 */
	setAnimation(animationName) {
		this.currentAnimation = animationName;
		this.animStart = Date.now();
	}

	/**
	 * @returns {HTMLCanvasElement}
	 */
	getElement() {
		return this.canvas;
	}

	/**
	 * @param {number} x
	 */
	setX(x) {
		this.x = x;
		this.canvas.style.left = `${x - this.canvas.width / 2 - (this.direction === Directions.RIGHT ? 2 : -2)}px`;
	}

	/**
	 * @param {number} y
	 */
	setY(y) {
		this.y = y;
		let bottom;
		if (this.isAbsolutePositioned) {
			// Position is absolute, convert from fixed
			// Account for address bar shrinkage on iOS
			bottom = y - window.scrollY - (getWindowHeight() - getFixedWindowHeight());
		} else {
			// Position is fixed
			bottom = y;
		}
		this.canvas.style.bottom = `${bottom}px`;
	}

	/**
	 * @param {number} direction
	 */
	setDirection(direction) {
		this.direction = direction;
	}

	/**
	 * Absolute positioning keeps the bird attached to the element while the page scrolls
	 * @param {boolean} absolute
	 */
	setAbsolutePositioned(absolute) {
		this.isAbsolutePositioned = absolute;
		this.canvas.classList.toggle("birb-absolute", absolute);
		this.setY(this.y);
	}

	/**
	 * @param {boolean} visible
	 */
	setVisible(visible) {
		this.visible = visible;
		this.canvas.style.display = visible ? "" : "none";
	}

	/**
	 * @returns {boolean}
	 */
	isVisible() {
		return this.visible;
	}
}
