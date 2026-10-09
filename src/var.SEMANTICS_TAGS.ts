export const VOID_TAG_NAMES: Set<string> = new Set([
	"AREA",
	"BASE",
	"BR",
	"COL",
	"EMBED",
	"HR",
	"IMG",
	"INPUT",
	"LINK",
	"META",
	"PARAM",
	"SOURCE",
	"TRACK",
	"WBR"
]);

export const INLINE_TAG_NAMES: Set<string> = new Set([
	"A",
	"ABBR",
	"B",
	"BDI",
	"BDO",
	"CITE",
	"CODE",
	"DATA",
	"DFN",
	"EM",
	"I",
	"KBD",
	"MARK",
	"Q",
	"RP",
	"RT",
	"RUBY",
	"S",
	"SAMP",
	"SMALL",
	"SPAN",
	"STRONG",
	"SUB",
	"SUP",
	"TIME",
	"U",
	"VAR",
	"WBR",
	"BR"
]);

export const RAW_TEXT_TAG_NAMES: Set<string> = new Set([
	"IFRAME",
	"NOSCRIPT",
	"SCRIPT",
	"STYLE",
	"TEXTAREA",
	"TITLE",
]);

export const NON_RENDERED_TAG_NAMES: Set<string> = new Set([
	"SCRIPT",
	"STYLE",
	"NOSCRIPT",
	"TEMPLATE"
]);

export const SVG_LABEL_TAG_NAMES: string[] = [
	"title",
	"desc"
];