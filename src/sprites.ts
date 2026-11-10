import { ALPHABET, BIRD_SHEET, HAT_SHEET, PALETTES } from "./sprites.generated.ts";
import type { SpeciesId } from "./species.ts";
import type { Palette, PixelGrid } from "./util.ts";

export interface EncodedSheet {
	/** Characters per cell */
	cellWidth: number;
	/** Cell values, indexed by the encoded characters */
	legend: string[];
	/** One encoded string per pixel row */
	rows: string[];
}

/**
 * Decode a generated sprite sheet into a 2D array of cell values
 */
function decodeSheet({ cellWidth, legend, rows }: EncodedSheet): PixelGrid {
	return rows.map((row) => {
		const cells: string[] = [];
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

export function getBirdSheet(): PixelGrid {
	return decodeSheet(BIRD_SHEET);
}

export function getHatSheet(): PixelGrid {
	return decodeSheet(HAT_SHEET);
}

export function getPalette(speciesId: SpeciesId): Palette {
	return PALETTES[speciesId];
}
