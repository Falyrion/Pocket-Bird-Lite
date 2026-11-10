export const Directions = /** @type {const} */ ({
	LEFT: -1,
	RIGHT: 1,
});

/**
 * @returns {boolean} Whether the user is on a mobile device
 */
export function isMobile() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get one square sprite from a horizontal sprite sheet
 * @param {string[][]} spriteSheet The sprite sheet pixel array
 * @param {number} spriteIndex The sprite index
 * @param {number} width The width (and height) of each sprite
 * @returns {string[][]}
 */
export function getLayerPixels(spriteSheet, spriteIndex, width) {
	const layer = [];
	for (let y = 0; y < width; y++) {
		layer.push(spriteSheet[y].slice(spriteIndex * width, (spriteIndex + 1) * width));
	}
	return layer;
}

/**
 * The height of the inner browser window
 * Will be the same as getFixedWindowHeight() on most browsers
 * On iOS, it will vary to be the height excluding the current address bar size (potentially greater than fixed height)
 */
export function getWindowHeight() {
	return window.innerHeight;
}

/**
 * The fixed height of the inner browser window
 * Will be the same as getWindowHeight() on most browsers
 * On iOS, it will always be the height of the window when the address bar is fully expanded
 */
export function getFixedWindowHeight() {
	return document.documentElement.clientHeight;
}
