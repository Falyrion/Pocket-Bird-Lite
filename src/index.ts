import * as config from "./config.ts";
import { Bird } from "./bird.ts";
import { BirdBehavior } from "./behavior.ts";
import { SPECIES, isValidSpecies, type SpeciesId } from "./species.ts";
import { HAT, isValidHat, type HatId } from "./hats.ts";
import { getBirdSheet, getHatSheet, getPalette } from "./sprites.ts";
import { STYLES } from "./styles.ts";

export { SPECIES, type SpeciesId, type Species } from "./species.ts";
export { HAT, type HatId } from "./hats.ts";

const HOST_ID = "pocket-bird";

export interface PocketBirdOptions {
	/** Species id, see `SPECIES`. Defaults to `SPECIES` in src/config.ts */
	species?: SpeciesId;
	/** Hat id, see `HAT`. Defaults to `HAT` in src/config.ts */
	hat?: HatId;
	/** CSS selectors for elements the bird can land on. Defaults to `LANDING_SELECTORS` in src/config.ts */
	landingSelectors?: readonly string[];
	/** Ignore elements whose top edge is closer than this to the top of the window (px). Defaults to `LANDING_TOP_MARGIN` */
	landingTopMargin?: number;
	/** Ignore elements narrower than this (px). Defaults to `LANDING_MIN_WIDTH` */
	landingMinWidth?: number;
	/** Size multiplier. Defaults to `SCALE` */
	scale?: number;
}

export interface PocketBird {
	/** Stop the bird and remove it from the page. Safe to call more than once. */
	destroy(): void;
}

/**
 * Add the bird to the page. Browser only, e.g. call from Vue's `onMounted`.
 */
export function createPocketBird(options: PocketBirdOptions = {}): PocketBird {
	const species = resolve<SpeciesId>(options.species ?? config.SPECIES, isValidSpecies, "bluebird", "species");
	const hat = resolve<HatId>(options.hat ?? config.HAT, isValidHat, HAT.NONE, "hat");

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
		getPalette(species),
		SPECIES[species].tags,
		hat
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

/**
 * Check an id at runtime (for callers that bypass the types), falling back if it is unknown
 */
function resolve<T extends string>(id: string, isValid: (id: string) => id is T, fallback: T, kind: string): T {
	if (isValid(id)) {
		return id;
	}
	console.warn(`Pocket Bird: unknown ${kind} "${id}", falling back to "${fallback}"`);
	return fallback;
}
