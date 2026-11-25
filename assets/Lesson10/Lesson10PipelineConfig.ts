import { director, gfx, math, renderer, rendering } from 'cc';
import { Lesson10CameraSettings } from './Lesson10CameraSettings';
import { Lesson10CameraConfig, Lesson10FX, Lesson10Resources } from './Lesson10PipelineTypes';

export const LESSON10_OPTIONS = {
    preferFloatHDR: true,
    debugFirstFrames: 3,
};

/** Giữ format ổn định trong cả session, không tự chuyển qua lại giữa setup()/resize(). */
let selectedColorFormat: gfx.Format | null = null;

export function getIntermediateFormat(): gfx.Format {
    if (selectedColorFormat !== null) {
        return selectedColorFormat;
    }

    const device = director.root?.device;
    const flags = gfx.FormatFeatureBit;

    const bits = device ? device.getFormatFeatures(gfx.Format.RGBA16F) : 0;

    const canRender = (bits & flags.RENDER_TARGET) !== 0;

    const canSample = (bits & flags.SAMPLED_TEXTURE) !== 0;

    const canLinearFilter = (bits & flags.LINEAR_FILTER) !== 0;

    console.log('[Lesson10:HDR Features]', {
        api: device ? gfx.API[device.gfxAPI] : 'No device',
        bits,
        canRender,
        canSample,
        canLinearFilter,
    });

    // Chỉ xét hai điều kiện cơ bản.
    // Linear filtering sẽ được xử lý riêng.
    const canUseHDR =
        !!device &&
        LESSON10_OPTIONS.preferFloatHDR &&
        canRender &&
        canSample;

    selectedColorFormat = canUseHDR ? gfx.Format.RGBA16F : gfx.Format.RGBA8;

    if (canUseHDR && !canLinearFilter) {
        console.warn(
            '[Lesson10] RGBA16F supports render/sample, ' +
            'but linear filtering is not reported. ' +
            'Use nearest sampling or verify filtering support.',
        );
    }

    console.log('[Lesson10:Format]',
        canUseHDR ? 'RGBA16F' : 'RGBA8 fallback',
    );

    return selectedColorFormat;
}

/** UUID hex (KHÔNG replace(/[!a-zA-Z0-9_]/g,...), vì gây collision). */
export function resourceNames(camera: renderer.scene.Camera): Lesson10Resources {
    const uuid = camera.node!.uuid;
    let hex = '';
    for (let i = 0; i < uuid.length; i++) hex += uuid.charCodeAt(i).toString(16).padStart(2, '0');
    const key = `L10_W${camera.window.renderWindowId}_C${hex}`;
    return {
        sceneColor: `${key}_SceneColor`, sceneDepth: `${key}_SceneDepth`,
        radiance: `${key}_Radiance`, halfBright: `${key}_HalfBright`,
        quarterDown: `${key}_QuarterDown`, quarterBlurH: `${key}_QuarterBlurH`,
        quarterBlurV: `${key}_QuarterBlurV`, halfBloom: `${key}_HalfBloom`,
        combined: `${key}_Combined`,
    };
}

export function scaledSizes(w: number, h: number) {
    const halfWidth = Math.max(1, Math.floor(w / 2));
    const halfHeight = Math.max(1, Math.floor(h / 2));
    return {
        halfWidth, halfHeight,
        quarterWidth: Math.max(1, Math.floor(halfWidth / 2)),
        quarterHeight: Math.max(1, Math.floor(halfHeight / 2)),
    };
}

export function fullViewport(w: number, h: number): gfx.Viewport {
    const v = new gfx.Viewport();
    v.left = 0;
    v.top = 0;
    v.width = w;
    v.height = h;
    return v;
}

export function cameraClearColor(camera: renderer.scene.Camera): gfx.Color {
    const c = camera.clearColor;
    return new gfx.Color(c.x, c.y, c.z, c.w);
}

function cameraViewport(camera: renderer.scene.Camera, w: number, h: number): gfx.Viewport {
    const v = camera.viewport;
    const out = new gfx.Viewport();
    out.left = Math.round(v.x * w);
    out.top = Math.round(v.y * h);
    out.width = Math.max(1, Math.round(v.width * w));
    out.height = Math.max(1, Math.round(v.height * h));
    return out;
}

export function collectCameraConfig(
    camera: renderer.scene.Camera,
    ppl: rendering.BasicPipeline,
    firstInWindow: boolean,
): Lesson10CameraConfig {
    const window = camera.window;
    const width = Math.max(1, Math.floor(window.width));
    const height = Math.max(1, Math.floor(window.height));
    const dims = scaledSizes(width, height);
    const resources = resourceNames(camera);
    const names = Object.values(resources);
    const resourcesReady = names.every(n => ppl.containsResource(n));
    const v = camera.viewport;
    const eps = 1e-4;
    const full = Math.abs(v.x) < eps && Math.abs(v.y) < eps
        && Math.abs(v.width - 1) < eps && Math.abs(v.height - 1) < eps;
    const settings = camera.node!.getComponent(Lesson10CameraSettings);
    const fmt = getIntermediateFormat();
    const useHDR = fmt === gfx.Format.RGBA16F;
    const applyPost = resourcesReady && full && !!settings?.enabledInHierarchy
        && !!settings.enablePost && !!settings.postMaterial && !!settings.toneMapMaterial;
    let fx: Lesson10FX | null = null;
    if (applyPost && settings?.postMaterial) {
        fx = {
            material: settings.postMaterial,
            toneMapMaterial: settings.toneMapMaterial,
            enableBloom: settings.enableBloom,
            // Fallback LDR: threshold > 1 would otherwise reject almost everything.
            threshold: useHDR ? math.clamp(settings.threshold, 0, 4)
                : math.clamp(settings.threshold, 0, 0.75),
            softKnee: math.clamp(settings.softKnee, 0.01, 1),
            intensity: math.clamp(settings.intensity, 0, 3),
            blurRadius: math.clamp(settings.blurRadius, 0.25, 4),
            detailWeight: math.clamp01(settings.detailWeight),
            diagnosticGain: math.clamp(settings.diagnosticGain, 1, 6),
            exposure: math.clamp(settings.exposure, 0.1, 5),
            toneMode: settings.toneMode,
            manualSRGB: settings.manualSRGB,
            transparentBackground: settings.transparentBackground,
            compositeWithAlpha: settings.compositeWithAlpha,
            glowAlphaStrength: math.clamp(settings.glowAlphaStrength, 0, 6),
        };
    }
    return {
        camera, window, width, height, ...dims,
        viewport: cameraViewport(camera, width, height),
        fullViewport: full, firstInWindow,
        resources, resourcesReady, applyPost, fx,
        useHDR, colorFormat: fmt,
    };
}
