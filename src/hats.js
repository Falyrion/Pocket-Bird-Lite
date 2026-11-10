import Layer from "./animation/layer.js";
import { getLayerPixels } from "./util.js";

const HAT_WIDTH = 12;

/** Hat ids, in sprite sheet order (sprites/hats.png), after NONE */
export const HAT = {
	NONE: "none",
	TOP_HAT: "top-hat",
	FEZ: "fez",
	WIZARD_HAT: "wizard-hat",
	BASEBALL_CAP: "baseball-cap",
	FLOWER_HAT: "flower-hat",
	COWBOY_HAT: "cowboy-hat",
	BEANIE: "beanie",
	SUN_HAT: "sun-hat",
	VIKING_HELMET: "viking-helmet",
	STRAW_HAT: "straw-hat",
	CORDOVAN_HAT: "cordovan-hat"
};

/**
 * @param {string} hatId
 * @returns {boolean}
 */
export function isValidHat(hatId) {
	return Object.values(HAT).includes(hatId);
}

/**
 * Build the hat layers for a single hat, for the bird's normal and head-down poses
 * @param {string[][]} spriteSheet
 * @param {string} hatId
 * @returns {{ base: Layer[], down: Layer[] }}
 */
export function createHatLayers(spriteSheet, hatId) {
	if (hatId === HAT.NONE) {
		return { base: [], down: [] };
	}
	const index = Object.values(HAT).indexOf(hatId) - 1;
	return {
		base: [buildHatLayer(spriteSheet, hatId, index)],
		down: [buildHatLayer(spriteSheet, hatId, index, 1)],
	};
}

/**
 * @param {string[][]} spriteSheet
 * @param {string} hatId
 * @param {number} hatIndex
 * @param {number} [yOffset=0]
 * @returns {Layer}
 */
function buildHatLayer(spriteSheet, hatId, hatIndex, yOffset = 0) {
	const LEFT_PADDING = 6;
	const RIGHT_PADDING = 14;
	const TOP_PADDING = 5 + yOffset;
	const BOTTOM_PADDING = Math.max(0, 15 - yOffset);

	let hatPixels = getLayerPixels(spriteSheet, hatIndex, HAT_WIDTH);
	hatPixels = pad(hatPixels, TOP_PADDING, BOTTOM_PADDING, LEFT_PADDING, RIGHT_PADDING);
	hatPixels = drawOutline(hatPixels);

	return new Layer(hatPixels, hatId);
}

/**
 * Add transparent padding around the pixel array
 * @param {string[][]} pixels
 * @param {number} top
 * @param {number} bottom
 * @param {number} left
 * @param {number} right
 * @returns {string[][]}
 */
function pad(pixels, top, bottom, left, right) {
	const rowLength = pixels[0].length + left + right;
	const emptyRow = () => Array(rowLength).fill("transparent");
	return [
		...Array.from({ length: top }, emptyRow),
		...pixels.map((row) => [...Array(left).fill("transparent"), ...row, ...Array(right).fill("transparent")]),
		...Array.from({ length: bottom }, emptyRow),
	];
}

/**
 * Draw a white outline around non-transparent pixels (sides and top only)
 * @param {string[][]} pixels
 * @return {string[][]}
 */
function drawOutline(pixels) {
	const neighborOffsets = [
		[-1, 0],
		[1, 0],
		[0, -1],
		[-1, -1],
		[1, -1],
	];
	for (let y = 0; y < pixels.length; y++) {
		for (let x = 0; x < pixels[y].length; x++) {
			const pixel = pixels[y][x];
			if (pixel !== "transparent" && pixel !== "#ffffff") {
				for (const [dx, dy] of neighborOffsets) {
					const newX = x + dx;
					const newY = y + dy;
					if (newY >= 0 && newY < pixels.length && newX >= 0 && newX < pixels[newY].length && pixels[newY][newX] === "transparent") {
						pixels[newY][newX] = "#ffffff";
					}
				}
			}
		}
	}
	return pixels;
}
