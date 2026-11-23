import { gfx, math, renderer, rendering, sys } from 'cc';
import { Lesson7CameraSettings } from 'db://assets/Lesson7/Lesson7CameraSettings';
import {
    Lesson7CameraConfig,
    Lesson7CameraResources, Lesson7FXConfig,
    Lesson7PipelineConfig,
} from 'db://assets/Lesson7/Lesson7PipelineTypes';

export const LESSON7_GLOBAL = {
    allowPostFX: true,
    debugFirstFrames: 3,
};

export function collectPipelineConfig(pipeline: rendering.BasicPipeline, verbose: boolean): Lesson7PipelineConfig {
    return {
        graphicsAPI: pipeline.device.gfxAPI,
        isNative: sys.isNative,
        isMobile: sys.isMobile,
        allowPostFX: LESSON7_GLOBAL.allowPostFX,
        verbose,
    };
}

export function cameraResourceKey(camera: renderer.scene.Camera): string {
    const uuid = camera.node!.uuid;
    let hex = '';
    for (let i = 0; i < uuid.length; i++) {
        hex += uuid.charCodeAt(i).toString(16).padStart(2, '0');
    }

    return `L7_W${camera.window.renderWindowId}_C${hex}`;
}

export function cameraResources(camera: renderer.scene.Camera): Lesson7CameraResources {
    const key = cameraResourceKey(camera);
    return {
        sceneColor: `${key}_SceneColor`,
        sceneDepth: `${key}_SceneDepth`,
        fxColor: `${key}_FXColor`,
    };
}

export function makeFullViewport(width: number, height: number): gfx.Viewport {
    const viewport = new gfx.Viewport();
    viewport.left = 0;
    viewport.top = 0;
    viewport.width = width;
    viewport.height = height;
    return viewport;
}

export function cameraViewport(camera: renderer.scene.Camera, width: number, height: number): gfx.Viewport {
    const v = camera.viewport;
    const result = new gfx.Viewport();
    result.left = Math.round(v.x * width);
    result.top = Math.round(v.y * height);
    result.width = Math.max(1, Math.round(v.width * width));
    result.height = Math.max(1, Math.round(v.height * height));
    return result;
}

function isFullViewport(camera: renderer.scene.Camera): boolean {
    const v = camera.viewport;
    const e = 0.0001;
    return Math.abs(v.x) < e && Math.abs(v.y) < e
        && Math.abs(v.width - 1) < e && Math.abs(v.height - 1) < e;
}

export function collectCameraConfig(
    camera: renderer.scene.Camera,
    ppl: rendering.BasicPipeline,
    pipelineConfig: Lesson7PipelineConfig,
    firstInWindow: boolean,
): Lesson7CameraConfig {
    const window = camera.window;
    const width = Math.max(1, Math.floor(window.width));
    const height = Math.max(1, Math.floor(window.height));
    const resources = cameraResources(camera);
    const settings = camera.node!.getComponent(Lesson7CameraSettings);
    const fullViewport = isFullViewport(camera);
    const resourcesReady = ppl.containsResource(resources.sceneColor)
        && ppl.containsResource(resources.sceneDepth)
        && ppl.containsResource(resources.fxColor);
    const applyPost = pipelineConfig.allowPostFX
        && fullViewport && resourcesReady
        && !!settings && settings.enabledInHierarchy
        && settings.enablePost && !!settings.postMaterial;

    const fx: Lesson7FXConfig | null = applyPost && settings && settings.postMaterial
        ? {
            material: settings.postMaterial,
            effectMode: settings.effectMode,
            strength: math.clamp01(settings.strength),
            tintColor: settings.tintColor.clone(),
            transparentBackground: settings.transparentBackground,
            compositeWithAlpha: settings.compositeWithAlpha,
        }
        : null;

    return {
        camera, window, width, height,
        viewport: cameraViewport(camera, width, height),
        firstInWindow, resources, resourcesReady, fullViewport, applyPost, fx,
    };
}