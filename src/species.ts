// Bird species: each one is a colour palette (a column in sprites/species.png)
// applied to the shared bird sprite. "tuft" species get an extra head tuft.

export interface Species {
	readonly name: string;
	readonly spriteIndex: number;
	readonly tags: readonly string[];
}

export const SPECIES = {
	bluebird: { name: "Eastern Bluebird", spriteIndex: 0, tags: [] },
	shimaEnaga: { name: "Shima Enaga", spriteIndex: 1, tags: [] },
	tuftedTitmouse: { name: "Tufted Titmouse", spriteIndex: 2, tags: ["tuft"] },
	europeanRobin: { name: "European Robin", spriteIndex: 3, tags: [] },
	redCardinal: { name: "Red Cardinal", spriteIndex: 4, tags: ["tuft"] },
	americanGoldfinch: { name: "American Goldfinch", spriteIndex: 5, tags: [] },
	barnSwallow: { name: "Barn Swallow", spriteIndex: 6, tags: [] },
	mistletoebird: { name: "Mistletoebird", spriteIndex: 7, tags: [] },
	scarletRobin: { name: "Scarlet Robin", spriteIndex: 8, tags: [] },
	americanRobin: { name: "American Robin", spriteIndex: 9, tags: [] },
	carolinaWren: { name: "Carolina Wren", spriteIndex: 10, tags: [] },
	blackCappedChickadee: { name: "Black-capped Chickadee", spriteIndex: 11, tags: [] },
	blueJay: { name: "Blue Jay", spriteIndex: 12, tags: ["tuft"] },
	darkEyedJunco: { name: "Dark-eyed Junco", spriteIndex: 13, tags: [] },
	houseFinch: { name: "House Finch", spriteIndex: 14, tags: [] },
	redWingedBlackbird: { name: "Red-winged Blackbird", spriteIndex: 28, tags: [] },
	pigeon: { name: "Rock Pigeon", spriteIndex: 15, tags: [] },
	redAvadavat: { name: "Red Avadavat", spriteIndex: 16, tags: [] },
	pinkRobin: { name: "Pink Robin", spriteIndex: 17, tags: [] },
	spangledCotinga: { name: "Spangled Cotinga", spriteIndex: 18, tags: [] },
	elegantEuphonia: { name: "Elegant Euphonia", spriteIndex: 19, tags: [] },
	paintedBunting: { name: "Painted Bunting", spriteIndex: 20, tags: [] },
	redWarbler: { name: "Red Warbler", spriteIndex: 21, tags: [] },
	cubanTody: { name: "Cuban Tody", spriteIndex: 22, tags: [] },
	violetBackedStarling: { name: "Violet-backed Starling", spriteIndex: 23, tags: [] },
	stellarsJay: { name: "Steller's Jay", spriteIndex: 27, tags: ["tuft"] },
	mourningDove: { name: "Mourning Dove", spriteIndex: 25, tags: [] },
	whiteWingedFairywren: { name: "White-winged Fairywren", spriteIndex: 26, tags: [] },
	littleCrow: { name: "Little Crow", spriteIndex: 24, tags: [] },
	redpoll: { name: "Redpoll", spriteIndex: 29, tags: [] },
	invisible: { name: "Invisible", spriteIndex: 30, tags: [] },
	pride: { name: "Pride", spriteIndex: 31, tags: [] },
	trans: { name: "Trans", spriteIndex: 32, tags: [] },
	pidgey: { name: "Pidgey", spriteIndex: 33, tags: [] },
} as const satisfies Record<string, Species>;

export type SpeciesId = keyof typeof SPECIES;

export function isValidSpecies(id: string): id is SpeciesId {
	return Object.hasOwn(SPECIES, id);
}
