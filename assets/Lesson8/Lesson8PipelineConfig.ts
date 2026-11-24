import { gfx, math, renderer, rendering, sys } from 'cc';
import { Lesson8CameraSettings } from 'db://assets/Lesson8/Lesson8CameraSettings';
import {
    Lesson8CameraConfig,
    Lesson8FXConfig,
    Lesson8PipelineConfig,
    Lesson8ResourceNames, Lesson8Stage,
} from 'db://assets/Lesson8/Lesson8PipelineTypes';

export const LESSON8_OPTIONS = {
    allowPostFX: true,
    debugFirstFrames: 3,
};

export function collectPipelineConfig(ppl: rendering.BasicPipeline, debug: boolean): Lesson8PipelineConfig {
    return {
        graphicsAPI: ppl.device.gfxAPI,
        isNative: sys.isNative,
        isMobile: sys.isMobile,
        allowPostFX: LESSON8_OPTIONS.allowPostFX,
        debug,
    };
}

function cameraResourceKey(camera: renderer.scene.Camera): string {
    const uuid = camera.node!.uuid;
    let hex = '';
    for (let i = 0; i < uuid.length; ++i) {
        hex += uuid.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return `L8_W${camera.window.renderWindowId}_C${hex}`;
}

export function cameraResources(camera: renderer.scene.Camera): Lesson8ResourceNames {
    const prefix = cameraResourceKey(camera);
    return {
        sceneColor: `${prefix}_SceneColor`,
        sceneDepth: `${prefix}_SceneDepth`,
        fxA: `${prefix}_FxA`,
        fxB: `${prefix}_FxB`,
    };
}

export function fullViewport(width: number, height: number): gfx.Viewport {
    const v = new gfx.Viewport();
    v.left = 0;
    v.top = 0;
    v.width = width;
    v.height = height;
    return v;
}

function viewportOf(camera: renderer.scene.Camera, width: number, height: number): gfx.Viewport {
    const rect = camera.viewport;
    const v = new gfx.Viewport();
    v.left = Math.round(rect.x * width);
    v.top = Math.round(rect.y * height);
    v.width = Math.max(1, Math.round(rect.width * width));
    v.height = Math.max(1, Math.round(rect.height * height));
    return v;
}

function isFullViewport(camera: renderer.scene.Camera): boolean {
    const v = camera.viewport;
    const eps = 0.0001;
    return Math.abs(v.x) < eps && Math.abs(v.y) < eps
        && Math.abs(v.width - 1) < eps && Math.abs(v.height - 1) < eps;
}

export function collectCameraConfig(
    camera: renderer.scene.Camera,
    ppl: rendering.BasicPipeline,
    pipelineConfig: Lesson8PipelineConfig,
    firstInWindow: boolean,
): Lesson8CameraConfig {
    const window = camera.window;
    const width = Math.max(1, Math.floor(window.width));
    const height = Math.max(1, Math.floor(window.height));
    const resources = cameraResources(camera);
    const resourcesReady = ppl.containsResource(resources.sceneColor)
        && ppl.containsResource(resources.sceneDepth)
        && ppl.containsResource(resources.fxA)
        && ppl.containsResource(resources.fxB);
    const full = isFullViewport(camera);
    const settings = camera.node!.getComponent(Lesson8CameraSettings);
    const applyPost = pipelineConfig.allowPostFX
        && resourcesReady && full
        && !!settings && settings.enabledInHierarchy
        && settings.enablePost && !!settings.postMaterial;

    let fx: Lesson8FXConfig | null = null;
    if (applyPost && settings && settings.postMaterial) {
        const stages: Lesson8Stage[] = [{
            mode: settings.effectMode,
            strength: math.clamp01(settings.strength),
        }];
        if (settings.enableSecondFX) {
            stages.push({
                mode: settings.secondEffectMode,
                strength: math.clamp01(settings.secondStrength),
            });
        }
        fx = {
            material: settings.postMaterial,
            stages,
            tintColor: settings.tintColor.clone(),
            transparentBackground: settings.transparentBackground,
            compositeWithAlpha: settings.compositeWithAlpha,
        };
    }

    return {
        camera, window, width, height,
        viewport: viewportOf(camera, width, height),
        fullViewport: full, firstInWindow,
        resources, resourcesReady,
        applyPost, fx,
    };
}

export function clearColorOf(camera: renderer.scene.Camera): gfx.Color {
    const c = camera.clearColor;
    return new gfx.Color(c.x, c.y, c.z, c.w);
}
