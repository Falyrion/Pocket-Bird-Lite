// Styles for the bird; injected into its shadow root only, so nothing leaks into the host page
export const STYLES = `
:host {
	--birb-scale: 1;
}

#birb {
	image-rendering: pixelated;
	position: fixed;
	bottom: 0;
	transform: scale(var(--birb-scale));
	transform-origin: bottom;
	z-index: 2147483638;
}

#birb.birb-absolute {
	position: absolute;
}

@media print {
	#birb {
		display: none;
	}
}
`;
