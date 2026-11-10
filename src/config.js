// Hardcoded defaults. Change these to customise the bird.
// Every value can also be overridden per instance: createPocketBird({ species: "blueJay" })

/**
 * Bird species id, see src/species.js for the full list.
 * e.g. "bluebird", "tuftedTitmouse", "redCardinal", "blueJay", "europeanRobin", "pigeon"
 */
export const SPECIES = "bluebird";

/**
 * Hat id, see src/hats.js for the full list.
 * "none", "top-hat", "fez", "wizard-hat", "baseball-cap", "flower-hat", "cowboy-hat",
 * "beanie", "sun-hat", "viking-helmet", "straw-hat", "cordovan-hat"
 * Note: on tufted species, a hat replaces the tuft.
 */
export const HAT = "none";

/** CSS selectors for elements the bird can land on */
export const LANDING_SELECTORS = ["img", "video"];

/** Elements whose top edge is closer than this to the top of the window are ignored (px) */
export const LANDING_TOP_MARGIN = 80;

/** Elements narrower than this are ignored (px) */
export const LANDING_MIN_WIDTH = 100;

/** Size multiplier for the bird */
export const SCALE = 1;
