import { Color, gfx, Material, renderer } from 'cc';

export enum Lesson7EffectMode {
    GRAYSCALE = 0,
    INVERT = 1,
    TINT = 2
}

export interface Lesson7PipelineConfig {
    graphicsAPI: gfx.API;
    isNative: boolean;
    isMobile: boolean;
    allowPostFX: boolean;
    verbose: boolean;
}

export interface Lesson7CameraResources {
    sceneColor: string;
    sceneDepth: string;
    fxColor: string;
}

export interface Lesson7FXConfig {
    material: Material;
    effectMode: Lesson7EffectMode;
    strength: number;
    tintColor: Color;
    transparentBackground: boolean;
    compositeWithAlpha: boolean;
}

export interface Lesson7CameraConfig {
    camera: renderer.scene.Camera;
    window: renderer.RenderWindow;
    width: number;
    height: number;
    viewport: gfx.Viewport;
    firstInWindow: boolean;
    resources: Lesson7CameraResources;
    resourcesReady: boolean;
    fullViewport: boolean;
    applyPost: boolean;
    fx: Lesson7FXConfig;
}
