import { gfx, math, renderer, rendering } from 'cc';
import { Lesson9CameraSettings } from './Lesson9CameraSettings';
import { Lesson9BloomConfig, Lesson9CameraConfig, Lesson9ResourceNames } from './Lesson9PipelineTypes';

export const LESSON9_OPTIONS = {
    allowBloom: true,
    debugFirstFrames: 3,
};

/** Mã hóa UUID thành hex để không trùng tên do thay ký tự bằng dấu '_'. */
export function resourceNames(camera: renderer.scene.Camera): Lesson9ResourceNames {
    const uuid = camera.node!.uuid;
    let hex = '';
    for (let i = 0; i < uuid.length; ++i) {
        hex += uuid.charCodeAt(i).toString(16).padStart(2, '0');
    }
    const k = `L9_W${camera.window.renderWindowId}_C${hex}`;
    return {
        sceneColor: `${k}_SceneColor`,
        sceneDepth: `${k}_SceneDepth`,
        halfBright: `${k}_HalfBright`,
        quarterDown: `${k}_QuarterDown`,
        quarterBlurH: `${k}_QuarterBlurH`,
        quarterBlurV: `${k}_QuarterBlurV`,
        halfBloom: `${k}_HalfBloom`,
        combined: `${k}_Combined`,
    };
}

export function sizes(width: number, height: number) {
    const halfWidth = Math.max(1, Math.floor(width / 2));
    const halfHeight = Math.max(1, Math.floor(height / 2));
    return {
        halfWidth, halfHeight,
        quarterWidth: Math.max(1, Math.floor(halfWidth / 2)),
        quarterHeight: Math.max(1, Math.floor(halfHeight / 2)),
    };
}

export function viewport(width: number, height: number): gfx.Viewport {
    const v = new gfx.Viewport();
    v.left = 0; v.top = 0; v.width = width; v.height = height;
    return v;
}

function cameraViewport(camera: renderer.scene.Camera, width: number, height: number): gfx.Viewport {
    const v = camera.viewport;
    const out = new gfx.Viewport();
    out.left = Math.round(v.x * width); out.top = Math.round(v.y * height);
    out.width = Math.max(1, Math.round(v.width * width));
    out.height = Math.max(1, Math.round(v.height * height));
    return out;
}

export function cameraClearColor(camera: renderer.scene.Camera): gfx.Color {
    const c = camera.clearColor;
    return new gfx.Color(c.x, c.y, c.z, c.w);
}

export function collectCameraConfig(
    camera: renderer.scene.Camera,
    ppl: rendering.BasicPipeline,
    firstInWindow: boolean,
): Lesson9CameraConfig {
    const window = camera.window;
    const width = Math.max(1, Math.floor(window.width));
    const height = Math.max(1, Math.floor(window.height));
    const dims = sizes(width, height);
    const resources = resourceNames(camera);
    const allResources = [
        resources.sceneColor, resources.sceneDepth,
        resources.halfBright, resources.quarterDown,
        resources.quarterBlurH, resources.quarterBlurV,
        resources.halfBloom, resources.combined,
    ];
    const resourcesReady = allResources.every(name => ppl.containsResource(name));
    const v = camera.viewport;
    const eps = 0.0001;
    const fullViewport = Math.abs(v.x) < eps && Math.abs(v.y) < eps
        && Math.abs(v.width - 1) < eps && Math.abs(v.height - 1) < eps;
    const settings = camera.node!.getComponent(Lesson9CameraSettings);
    const applyBloom = LESSON9_OPTIONS.allowBloom && fullViewport && resourcesReady
        && !!settings && settings.enabledInHierarchy
        && settings.enableBloom && !!settings.bloomMaterial;
    let bloom: Lesson9BloomConfig | null = null;
    if (applyBloom && settings && settings.bloomMaterial) {
        bloom = {
            material: settings.bloomMaterial,
            threshold: math.clamp01(settings.threshold),
            softKnee: math.clamp(settings.softKnee, 0.01, 0.5),
            intensity: math.clamp(settings.intensity, 0, 2),
            blurRadius: math.clamp(settings.blurRadius, 0.25, 3),
            detailWeight: math.clamp01(settings.detailWeight),
            glowAlphaStrength: math.clamp(settings.glowAlphaStrength, 0, 3),
            transparentBackground: settings.transparentBackground,
            compositeWithAlpha: settings.compositeWithAlpha,
        };
    }
    return {
        camera, window, width, height, ...dims,
        viewport: cameraViewport(camera, width, height),
        fullViewport, firstInWindow,
        resources, resourcesReady, applyBloom, bloom,
    };
}
