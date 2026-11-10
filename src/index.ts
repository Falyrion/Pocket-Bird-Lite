import * as config from "./config.ts";
import { Bird } from "./bird.ts";
import { BirdBehavior, type BehaviorOptions } from "./behavior.ts";
import { SPECIES, isValidSpecies, type SpeciesId } from "./species.ts";
import type { HatId } from "./hats.ts";
import { isValidHat } from "./hats.ts";
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
	/** CSS selectors for elements the bird lands on the top edge of. Defaults to `LANDING_SELECTORS` in src/config.ts */
	landingSelectors?: readonly string[];
	/** CSS selectors for elements the bird lands on the first line of text of. Defaults to `TEXT_LANDING_SELECTORS` in src/config.ts */
	textLandingSelectors?: readonly string[];
	/** Ignore elements whose top edge is closer than this to the top of the window (px). Defaults to `LANDING_TOP_MARGIN` */
	landingTopMargin?: number;
	/** Ignore landing surfaces narrower than this (px); for text, the width of the first line. Defaults to `LANDING_MIN_WIDTH` */
	landingMinWidth?: number;
	/** Size multiplier. Defaults to `SCALE` */
	scale?: number;
}

export interface PocketBird {
	/**
	 * Change settings on the running bird. Only the options you pass change.
	 * Species, hat and scale update immediately; landing options apply the next time the bird picks somewhere to land.
	 * Unknown species or hat ids are ignored with a console warning.
	 */
	update(options: PocketBirdOptions): void;
	/** The settings currently in effect, including defaults from src/config.ts */
	getOptions(): Readonly<PocketBirdSettings>;
	/** Stop the bird and remove it from the page. Safe to call more than once. */
	destroy(): void;
}

/** All options, resolved */
export type PocketBirdSettings = Required<PocketBirdOptions>;

/**
 * Add the bird to the page. Browser only, e.g. call from Vue's `onMounted`.
 */
export function createPocketBird(options: PocketBirdOptions = {}): PocketBird {
	let settings = applyOptions(getDefaults(), options);

	// Body-level host so fixed/absolute positioning is relative to the page, not a component
	const host = document.createElement("div");
	host.id = HOST_ID;
	host.style.setProperty("--birb-scale", String(settings.scale));
	const root = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = STYLES;
	root.appendChild(style);
	document.body.appendChild(host);

	const bird = new Bird(
		root,
		getBirdSheet(),
		getHatSheet(),
		getPalette(settings.species),
		SPECIES[settings.species].tags,
		settings.hat
	);

	const behavior = new BirdBehavior(bird, getBehaviorOptions(settings));
	behavior.start();

	let destroyed = false;
	return {
		update(changes) {
			if (destroyed) {
				return;
			}
			const next = applyOptions(settings, changes);
			if (next.species !== settings.species || next.hat !== settings.hat) {
				bird.setAppearance(getPalette(next.species), SPECIES[next.species].tags, next.hat);
			}
			if (next.scale !== settings.scale) {
				host.style.setProperty("--birb-scale", String(next.scale));
			}
			behavior.setOptions(getBehaviorOptions(next));
			settings = next;
		},
		getOptions() {
			return { ...settings };
		},
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

function getDefaults(): PocketBirdSettings {
	return {
		species: config.SPECIES,
		hat: config.HAT,
		landingSelectors: config.LANDING_SELECTORS,
		textLandingSelectors: config.TEXT_LANDING_SELECTORS,
		landingTopMargin: config.LANDING_TOP_MARGIN,
		landingMinWidth: config.LANDING_MIN_WIDTH,
		scale: config.SCALE,
	};
}

/**
 * Merge options into settings, ignoring options that are left out
 */
function applyOptions(base: PocketBirdSettings, options: PocketBirdOptions): PocketBirdSettings {
	return {
		species: options.species === undefined ? base.species : resolve(options.species, isValidSpecies, base.species, "species"),
		hat: options.hat === undefined ? base.hat : resolve(options.hat, isValidHat, base.hat, "hat"),
		landingSelectors: options.landingSelectors ?? base.landingSelectors,
		textLandingSelectors: options.textLandingSelectors ?? base.textLandingSelectors,
		landingTopMargin: options.landingTopMargin ?? base.landingTopMargin,
		landingMinWidth: options.landingMinWidth ?? base.landingMinWidth,
		scale: options.scale ?? base.scale,
	};
}

function getBehaviorOptions(settings: PocketBirdSettings): BehaviorOptions {
	return {
		landingSelectors: settings.landingSelectors,
		textLandingSelectors: settings.textLandingSelectors,
		landingTopMargin: settings.landingTopMargin,
		landingMinWidth: settings.landingMinWidth,
	};
}

/**
 * Check an id at runtime (for callers that bypass the types), keeping the fallback if it is unknown
 */
function resolve<T extends string>(id: string, isValid: (id: string) => id is T, fallback: T, kind: string): T {
	if (isValid(id)) {
		return id;
	}
	console.warn(`Pocket Bird: unknown ${kind} "${id}", keeping "${fallback}"`);
	return fallback;
}
