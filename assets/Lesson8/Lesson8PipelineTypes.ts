import { Color, gfx, Material, renderer } from 'cc';

export enum Lesson8EffectMode {
    GRAYSCALE = 0,
    INVERT = 1,
    TINT = 2,
}

export interface Lesson8PipelineConfig {
    graphicsAPI: gfx.API;
    isNative: boolean;
    isMobile: boolean;
    allowPostFX: boolean;
    debug: boolean;
}

export interface Lesson8ResourceNames {
    sceneColor: string;
    sceneDepth: string;
    fxA: string;
    fxB: string;
}

export interface Lesson8Stage {
    mode: Lesson8EffectMode;
    strength: number;
}

export interface Lesson8FXConfig {
    material: Material;
    stages: Lesson8Stage[];
    tintColor: Color;
    transparentBackground: boolean;
    compositeWithAlpha: boolean;
}

export interface Lesson8CameraConfig {
    camera: renderer.scene.Camera;
    window: renderer.RenderWindow;
    width: number;
    height: number;
    viewport: gfx.Viewport;
    fullViewport: boolean;
    firstInWindow: boolean;
    resources: Lesson8ResourceNames;
    resourcesReady: boolean;
    applyPost: boolean;
    fx: Lesson8FXConfig | null;
}