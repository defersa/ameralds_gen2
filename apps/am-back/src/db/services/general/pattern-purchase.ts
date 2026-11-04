export interface OwnedPatternSelection {
	patternId: number;
	color: boolean;
	sizeIds: number[];
}

export interface GrantedPatternSelection {
	patternId: number | null;
	active: boolean;
	color: boolean;
	sizes: { id: number; active: boolean }[];
}
