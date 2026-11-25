import { gfx, Material, renderer } from 'cc';

/** Tài nguyên thuộc một Camera và một RenderWindow. */
export interface Lesson10Resources {
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

/** Tham số đã được chuẩn hóa, chỉ đọc trong các builder. */
export interface Lesson10FX {
    material: Material;
    toneMapMaterial: Material;
    enableBloom: boolean;
    threshold: number;
    softKnee: number;
    intensity: number;
    blurRadius: number;
    detailWeight: number;
    diagnosticGain: number;
    exposure: number;
    toneMode: number;       // 0 = Reinhard, 1 = ACES approximation
    manualSRGB: boolean;   // OFF by default: beware platform conversions
    transparentBackground: boolean;
    compositeWithAlpha: boolean;
    glowAlphaStrength: number;
}

export interface Lesson10CameraConfig {
    camera: renderer.scene.Camera;
    window: renderer.RenderWindow;
    width: number;
    height: number;
    halfWidth: number;
    halfHeight: number;
    quarterWidth: number;
    quarterHeight: number;
    viewport: gfx.Viewport;
    fullViewport: boolean;
    firstInWindow: boolean;
    useHDR: boolean;
    colorFormat: gfx.Format;
    resources: Lesson10Resources;
    resourcesReady: boolean;
    applyPost: boolean;
    fx: Lesson10FX | null;
}
