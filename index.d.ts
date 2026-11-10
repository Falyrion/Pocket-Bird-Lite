export interface PocketBirdOptions {
	/** Species id, see `SPECIES`. Defaults to `SPECIES` in src/config.js */
	species?: string;
	/** Hat id, see `HAT`. Defaults to `HAT` in src/config.js */
	hat?: string;
	/** CSS selectors for elements the bird can land on. Defaults to `["img", "video"]` */
	landingSelectors?: string[];
	/** Ignore elements whose top edge is closer than this to the top of the window (px). Defaults to 80 */
	landingTopMargin?: number;
	/** Ignore elements narrower than this (px). Defaults to 100 */
	landingMinWidth?: number;
	/** Size multiplier. Defaults to 1 */
	scale?: number;
}

export interface PocketBird {
	/** Stop the bird and remove it from the page. Safe to call more than once. */
	destroy(): void;
}

/** Add the bird to the page. Browser only, e.g. call from Vue's `onMounted`. */
export function createPocketBird(options?: PocketBirdOptions): PocketBird;

/** All species, keyed by id */
export const SPECIES: Record<string, { name: string; spriteIndex: number; tags: string[] }>;

/** All hat ids */
export const HAT: {
	NONE: "none";
	TOP_HAT: "top-hat";
	FEZ: "fez";
	WIZARD_HAT: "wizard-hat";
	BASEBALL_CAP: "baseball-cap";
	FLOWER_HAT: "flower-hat";
	COWBOY_HAT: "cowboy-hat";
	BEANIE: "beanie";
	SUN_HAT: "sun-hat";
	VIKING_HELMET: "viking-helmet";
	STRAW_HAT: "straw-hat";
	CORDOVAN_HAT: "cordovan-hat";
};
