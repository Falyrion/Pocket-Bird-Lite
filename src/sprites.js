import { ALPHABET, BIRD_SHEET, HAT_SHEET, PALETTES } from "./sprites.generated.js";

/**
 * @typedef {Object} EncodedSheet
 * @property {number} cellWidth Characters per cell
 * @property {string[]} legend Cell values
 * @property {string[]} rows One encoded string per pixel row
 */

/**
 * Decode a generated sprite sheet into a 2D array of cell values
 * @param {EncodedSheet} sheet
 * @returns {string[][]}
 */
function decodeSheet({ cellWidth, legend, rows }) {
	return rows.map((row) => {
		const cells = [];
		for (let i = 0; i < row.length; i += cellWidth) {
			let index = 0;
			for (let j = 0; j < cellWidth; j++) {
				index = index * ALPHABET.length + ALPHABET.indexOf(row[i + j]);
			}
			cells.push(legend[index]);
		}
		return cells;
	});
}

/** @returns {string[][]} */
export function getBirdSheet() {
	return decodeSheet(BIRD_SHEET);
}

/** @returns {string[][]} */
export function getHatSheet() {
	return decodeSheet(HAT_SHEET);
}

/**
 * @param {string} speciesId
 * @returns {Record<string, string>|undefined}
 */
export function getPalette(speciesId) {
	return PALETTES[speciesId];
}
