// -------------------------------------
// Copyright (c) Thassilo M. Schiepanski
// -------------------------------------


import { d2Snap, adaptiveD2Snap } from "./api.js";


declare global {
    interface Window {
        D2Snap: any;
        adaptiveD2Snap: any;
    }
}


window.D2Snap = {
    d2Snap, adaptiveD2Snap
};