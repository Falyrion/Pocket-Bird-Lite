import type { PixelGrid } from "../util.ts";

export const TAG = {
	DEFAULT: "default",
	TUFT: "tuft",
} as const;

/**
 * One sprite layer. Layers with a tag other than "default" are only drawn when that tag is active.
 */
export default class Layer {
	readonly pixels: PixelGrid;
	readonly tag: string;

	constructor(pixels: PixelGrid, tag: string = TAG.DEFAULT) {
		this.pixels = pixels;
		this.tag = tag;
	}
}
