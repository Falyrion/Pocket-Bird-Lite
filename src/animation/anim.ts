import type { Direction, Palette } from "../util.ts";
import type Frame from "./frame.ts";

/**
 * A sequence of frames with per-frame durations (ms)
 */
export default class Anim {
	readonly frames: Frame[];
	readonly durations: number[];
	readonly loop: boolean;
	#lastFrameIndex = -1;
	#lastDirection: Direction | null = null;
	#lastTimeStart: number | null = null;

	constructor(frames: Frame[], durations: number[], loop = true) {
		this.frames = frames;
		this.durations = durations;
		this.loop = loop;
	}

	getAnimationDuration(): number {
		return this.durations.reduce((a, b) => a + b, 0);
	}

	/**
	 * @param time The elapsed time since animation start
	 * @returns The index of the current frame
	 */
	getCurrentFrameIndex(time: number): number {
		let totalDuration = 0;
		for (let i = 0; i < this.durations.length; i++) {
			totalDuration += this.durations[i];
			if (time < totalDuration) {
				return i;
			}
		}
		return this.frames.length - 1;
	}

	/**
	 * Draw the current frame, skipping the redraw if nothing changed
	 * @param timeStart The start time of the animation in milliseconds
	 * @returns Whether the animation is complete (always false for looping animations)
	 */
	draw(ctx: CanvasRenderingContext2D, direction: Direction, timeStart: number, canvasPixelSize: number, palette: Palette, tags: readonly string[]): boolean {
		// Reset cache if animation was restarted
		if (this.#lastTimeStart !== timeStart) {
			this.#lastFrameIndex = -1;
			this.#lastDirection = null;
			this.#lastTimeStart = timeStart;
		}

		let time = Date.now() - timeStart;
		const duration = this.getAnimationDuration();
		if (this.loop) {
			time %= duration;
		}

		const frameIndex = this.getCurrentFrameIndex(time);
		if (frameIndex !== this.#lastFrameIndex || direction !== this.#lastDirection) {
			this.frames[frameIndex].draw(ctx, direction, canvasPixelSize, palette, tags);
			this.#lastFrameIndex = frameIndex;
			this.#lastDirection = direction;
		}

		return !this.loop && time >= duration;
	}
}
