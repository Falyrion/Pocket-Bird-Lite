import * as config from "./config.js";
import { Bird } from "./bird.js";
import { BirdBehavior } from "./behavior.js";
import { SPECIES } from "./species.js";
import { HAT, isValidHat } from "./hats.js";
import { getBirdSheet, getHatSheet, getPalette } from "./sprites.js";
import { STYLES } from "./styles.js";

export { SPECIES } from "./species.js";
export { HAT } from "./hats.js";

const HOST_ID = "pocket-bird";

/**
 * @typedef {Object} PocketBirdOptions
 * @property {string} [species] Species id (see src/species.js). Defaults to config.SPECIES
 * @property {string} [hat] Hat id (see src/hats.js). Defaults to config.HAT
 * @property {string[]} [landingSelectors] CSS selectors the bird can land on. Defaults to config.LANDING_SELECTORS
 * @property {number} [landingTopMargin] Ignore elements whose top is closer than this to the top of the window (px). Defaults to config.LANDING_TOP_MARGIN
 * @property {number} [landingMinWidth] Ignore elements narrower than this (px). Defaults to config.LANDING_MIN_WIDTH
 * @property {number} [scale] Size multiplier. Defaults to config.SCALE
 */

/**
 * @typedef {Object} PocketBird
 * @property {() => void} destroy Stop the bird and remove it from the page
 */

/**
 * Add the bird to the page. Call from the browser only (e.g. Vue's onMounted).
 * @param {PocketBirdOptions} [options]
 * @returns {PocketBird}
 */
export function createPocketBird(options = {}) {
	let speciesId = options.species ?? config.SPECIES;
	let hatId = options.hat ?? config.HAT;

	const palette = getPalette(speciesId);
	if (!SPECIES[speciesId] || !palette) {
		console.warn(`Pocket Bird: unknown species "${speciesId}", falling back to bluebird`);
		speciesId = "bluebird";
	}
	if (!isValidHat(hatId)) {
		console.warn(`Pocket Bird: unknown hat "${hatId}", falling back to none`);
		hatId = HAT.NONE;
	}

	// Body-level host so fixed/absolute positioning is relative to the page, not a component
	const host = document.createElement("div");
	host.id = HOST_ID;
	host.style.setProperty("--birb-scale", String(options.scale ?? config.SCALE));
	const root = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = STYLES;
	root.appendChild(style);
	document.body.appendChild(host);

	const bird = new Bird(
		root,
		getBirdSheet(),
		getHatSheet(),
		/** @type {Record<string, string>} */ (getPalette(speciesId)),
		SPECIES[speciesId].tags,
		hatId
	);

	const behavior = new BirdBehavior(bird, {
		landingSelectors: options.landingSelectors ?? config.LANDING_SELECTORS,
		landingTopMargin: options.landingTopMargin ?? config.LANDING_TOP_MARGIN,
		landingMinWidth: options.landingMinWidth ?? config.LANDING_MIN_WIDTH,
	});
	behavior.start();

	let destroyed = false;
	return {
		destroy() {
			if (destroyed) {
				return;
			}
			destroyed = true;
			behavior.stop();
			host.remove();
		},
	};
}
