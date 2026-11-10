/** 2D array of cell values: palette slot keys, hex colours or "transparent" */
export type PixelGrid = string[][];

/** Palette slot key -> colour */
export type Palette = Record<string, string>;

export const Directions = {
	LEFT: -1,
	RIGHT: 1,
} as const;

export type Direction = typeof Directions[keyof typeof Directions];

/**
 * @returns Whether the user is on a mobile device
 */
export function isMobile(): boolean {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get one square sprite from a horizontal sprite sheet
 * @param spriteSheet The sprite sheet pixel array
 * @param spriteIndex The sprite index
 * @param width The width (and height) of each sprite
 */
export function getLayerPixels(spriteSheet: PixelGrid, spriteIndex: number, width: number): PixelGrid {
	const layer: PixelGrid = [];
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
export function getWindowHeight(): number {
	return window.innerHeight;
}

/**
 * The fixed height of the inner browser window
 * Will be the same as getWindowHeight() on most browsers
 * On iOS, it will always be the height of the window when the address bar is fully expanded
 */
export function getFixedWindowHeight(): number {
	return document.documentElement.clientHeight;
}
