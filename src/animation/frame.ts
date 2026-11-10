import { Directions, type Direction, type Palette, type PixelGrid } from "../util.ts";
import Layer, { TAG } from "./layer.ts";

/**
 * A single image built from stacked layers. The composite is precomputed once per tag.
 */
export default class Frame {
	#pixelsByTag: Record<string, PixelGrid> = {};

	constructor(layers: Layer[]) {
		if (layers[0].tag !== TAG.DEFAULT) {
			throw new Error("First layer must have the 'default' tag");
		}
		const tags = new Set<string>(layers.map((layer) => layer.tag));
		tags.add(TAG.DEFAULT);
		const maxHeight = layers.reduce((max, layer) => Math.max(max, layer.pixels.length), 0);

		for (const tag of tags) {
			const pixels = layers[0].pixels.map((row) => row.slice());
			// Pad from top with transparent pixels
			while (pixels.length < maxHeight) {
				pixels.unshift(new Array(pixels[0].length).fill("transparent"));
			}
			// Combine layers
			for (let i = 1; i < layers.length; i++) {
				if (layers[i].tag !== TAG.DEFAULT && layers[i].tag !== tag) {
					continue;
				}
				const layerPixels = layers[i].pixels;
				const topMargin = maxHeight - layerPixels.length;
				for (let y = 0; y < layerPixels.length; y++) {
					for (let x = 0; x < layerPixels[y].length; x++) {
						if (layerPixels[y][x] !== "transparent") {
							pixels[y + topMargin][x] = layerPixels[y][x];
						}
					}
				}
			}
			this.#pixelsByTag[tag] = pixels;
		}
	}

	/**
	 * Get the composite for the last tag in the list that this frame has
	 */
	getPixels(tags: readonly string[] = [TAG.DEFAULT]): PixelGrid {
		for (let i = tags.length - 1; i >= 0; i--) {
			const pixels = this.#pixelsByTag[tags[i]];
			if (pixels) {
				return pixels;
			}
		}
		return this.#pixelsByTag[TAG.DEFAULT];
	}

	draw(ctx: CanvasRenderingContext2D, direction: Direction, canvasPixelSize: number, palette: Palette, tags: readonly string[]): void {
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		const pixels = this.getPixels(tags);
		for (let y = 0; y < pixels.length; y++) {
			const row = pixels[y];
			for (let x = 0; x < row.length; x++) {
				const cell = direction === Directions.LEFT ? row[x] : row[row.length - x - 1];
				ctx.fillStyle = palette[cell] ?? cell;
				ctx.fillRect(x * canvasPixelSize, y * canvasPixelSize, canvasPixelSize, canvasPixelSize);
			}
		}
	}
}
