import { d2Snap, adaptiveD2Snap } from "./api.js";
declare global {
    interface Window {
        D2Snap: {
            d2Snap: typeof d2Snap;
            adaptiveD2Snap: typeof adaptiveD2Snap;
        };
    }
}
