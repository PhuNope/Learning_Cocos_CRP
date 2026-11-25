import { gfx, Material, renderer } from 'cc';

/** Một bộ texture logic cho mỗi RenderWindow, KHÔNG gắn UUID Camera. */
export interface Lesson11WindowResources {
    sceneColor: string;
    sceneDepth: string;
    radiance: string;
    halfBright: string;
    quarterDown: string;
    quarterBlurH: string;
    quarterBlurV: string;
    halfBloom: string;
    combined: string;
}

export interface Lesson11WindowFX {
    hdrBloomMaterial: Material;
    toneMapMaterial: Material;
    enableBloom: boolean;
    threshold: number;
    softKnee: number;
    intensity: number;
    blurRadius: number;
    detailWeight: number;
    diagnosticGain: number;
    exposure: number;
    toneMode: number;
    manualSRGB: boolean;
}

export interface Lesson11WindowConfig {
    window: renderer.RenderWindow;
    width: number;
    height: number;
    halfWidth: number;
    halfHeight: number;
    quarterWidth: number;
    quarterHeight: number;
    resources: Lesson11WindowResources;
    resourcesReady: boolean;
    colorFormat: gfx.Format;
    useHDR: boolean;
    fx: Lesson11WindowFX | null;
}
