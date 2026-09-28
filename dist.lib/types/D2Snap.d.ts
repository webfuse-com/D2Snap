import { type D2SnapOptions, type D2SnapResult, type DOM } from "./types.js";
export declare function isActionableElement(elementNode: Element, actionableElementTagNames: Set<string>, actionableRoleAttributeValues?: Set<string>): boolean;
export declare function d2Snap(dom: DOM, rE: number, rA: number, rT: number, options?: Partial<D2SnapOptions>): D2SnapResult;
