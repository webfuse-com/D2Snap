import { GroundTruthJSON } from "./types.js";


const HARD_FALLBACK_RATING: number = 0.0;


export class GroundTruth {
    private readonly groundTruth: GroundTruthJSON;

    constructor(groundTruth: GroundTruthJSON) {
        this.groundTruth = groundTruth;
    }

    public isElementType(type: "container" | "actionable" | "textFormatting", tagName: string): boolean {
        const isNativeElement: boolean = (
            (
                this.groundTruth
                    ?.typeElement[type]
                    ?.tagNames
            ) ?? []
        )
            .includes(tagName.toLowerCase());

        if(isNativeElement) return true;
        if(type !== "container") return isNativeElement;

        const isCustomElement: boolean = ![
            ...this.groundTruth
                    ?.typeElement
                    .actionable
                    ?.tagNames ?? [],
            ...this.groundTruth
                    ?.typeElement
                    .textFormatting
                    ?.tagNames ?? []
        ]
            .includes(tagName.toLowerCase());

        return isCustomElement;
    }

    public getContainerRating(tagName: string): number {
        if(!tagName) return -Infinity;

        const rating: number | undefined = (
            (
                this.groundTruth
                    ?.typeElement
                    ?.container
                    ?.ratings
            ) ?? {}
        )[tagName.toLowerCase()];
        if(rating !== undefined) return rating;

        const fallbackRating: number | undefined = this.groundTruth
            ?.typeElement
            ?.container
            ?.fallbackRating;

        return fallbackRating ?? HARD_FALLBACK_RATING;
    }

    public getAttributeRating(attributeName: string): number {
        if(!attributeName) return -Infinity;

        const rating: number | undefined = (
            (
                this.groundTruth
                    ?.typeAttribute
                    ?.ratings
            ) ?? {}
        )[attributeName.toLowerCase()];
        if(rating !== undefined) return rating;

        const fallbackRating: number | undefined = this.groundTruth
            ?.typeAttribute
            ?.fallbackRating;

        return fallbackRating ?? HARD_FALLBACK_RATING;
    }
}


export async function createDefaultGroundTruth(): Promise<GroundTruth> {
    return new GroundTruth(
        (
            await import("../variables/ground-truth.json", { with: { type: "json" }})
        )
            .default as GroundTruthJSON
    );
}

