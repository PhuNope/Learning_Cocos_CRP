import { director, gfx, math, renderer, rendering } from 'cc';
import { Lesson11CameraSettings } from './Lesson11CameraSettings';
import { Lesson11WindowConfig, Lesson11WindowFX, Lesson11WindowResources } from './Lesson11PipelineTypes';

export const LESSON11_OPTIONS = {
    preferFloatHDR: true,
    /**
     * An toàn trên WebGL2: nếu RGBA16F không báo LINEAR_FILTER, fallback RGBA8.
     * Chỉ chuyển true khi đã tự cấu hình/kiểm chứng sampler POINT cho HDR textures.
     */
    allowFloatWithoutLinearFilter: false,
    debugFirstFrames: 3,
};

let selectedFormat: gfx.Format | null = null;
export function lesson11IntermediateFormat(): gfx.Format {
    if (selectedFormat !== null) return selectedFormat;
    const dev = director.root?.device;
    const feature = dev ? dev.getFormatFeatures(gfx.Format.RGBA16F) : 0;
    const flags = gfx.FormatFeatureBit;
    const canRender = (feature & flags.RENDER_TARGET) !== 0;
    const canSample = (feature & flags.SAMPLED_TEXTURE) !== 0;
    const canLinearFilter = (feature & flags.LINEAR_FILTER) !== 0;
    const compatible = canRender && canSample &&
        (canLinearFilter || LESSON11_OPTIONS.allowFloatWithoutLinearFilter);
    const useHDR = !!dev && LESSON11_OPTIONS.preferFloatHDR && compatible;
    selectedFormat = useHDR ? gfx.Format.RGBA16F : gfx.Format.RGBA8;
    console.log('[Lesson11:Format]', {
        api: dev ? gfx.API[dev.gfxAPI] : 'NONE', feature,
        canRender, canSample, canLinearFilter,
        selected: useHDR ? 'RGBA16F' : 'RGBA8',
    });
    if (useHDR && !canLinearFilter) {
        console.warn('[Lesson11] RGBA16F thiếu LINEAR_FILTER; kiểm tra sampler POINT trước khi dùng Bloom.');
    }
    return selectedFormat;
}

export function lesson11ResourceNames(window: renderer.RenderWindow): Lesson11WindowResources {
    const key = `L11_W${window.renderWindowId}`;
    return {
        sceneColor: `${key}_SceneColor`, sceneDepth: `${key}_SceneDepth`,
        radiance: `${key}_Radiance`, halfBright: `${key}_HalfBright`,
        quarterDown: `${key}_QuarterDown`, quarterBlurH: `${key}_QuarterBlurH`,
        quarterBlurV: `${key}_QuarterBlurV`, halfBloom: `${key}_HalfBloom`,
        combined: `${key}_Combined`,
    };
}

export function lesson11ScaledSizes(width: number, height: number) {
    const halfWidth = Math.max(1, Math.floor(width / 2));
    const halfHeight = Math.max(1, Math.floor(height / 2));
    return {
        halfWidth, halfHeight,
        quarterWidth: Math.max(1, Math.floor(halfWidth / 2)),
        quarterHeight: Math.max(1, Math.floor(halfHeight / 2)),
    };
}

export function lesson11FullViewport(width: number, height: number): gfx.Viewport {
    const v = new gfx.Viewport();
    v.left = 0; v.top = 0; v.width = width; v.height = height;
    return v;
}

export function lesson11CameraViewport(camera: renderer.scene.Camera, w: number, h: number): gfx.Viewport {
    const v = camera.viewport;
    const out = new gfx.Viewport();
    out.left = Math.round(v.x * w); out.top = Math.round(v.y * h);
    out.width = Math.max(1, Math.round(v.width * w));
    out.height = Math.max(1, Math.round(v.height * h));
    return out;
}

export function lesson11ClearColor(camera: renderer.scene.Camera): gfx.Color {
    const c = camera.clearColor;
    return new gfx.Color(c.x, c.y, c.z, c.w);
}

export function lesson11WindowConfig(
    window: renderer.RenderWindow,
    ppl: rendering.BasicPipeline,
    controller: Lesson11CameraSettings,
): Lesson11WindowConfig {
    const width = Math.max(1, Math.floor(window.width));
    const height = Math.max(1, Math.floor(window.height));
    const resources = lesson11ResourceNames(window);
    const colorFormat = lesson11IntermediateFormat();
    const resourcesReady = Object.values(resources).every(name => ppl.containsResource(name));
    const useHDR = colorFormat === gfx.Format.RGBA16F;
    let fx: Lesson11WindowFX | null = null;
    if (controller.enabledInHierarchy && controller.enableWindowPost &&
        controller.hdrBloomMaterial && controller.toneMapMaterial && resourcesReady) {
        fx = {
            hdrBloomMaterial: controller.hdrBloomMaterial,
            toneMapMaterial: controller.toneMapMaterial,
            enableBloom: controller.enableBloom,
            threshold: useHDR ? math.clamp(controller.threshold, 0, 4)
                              : math.clamp(controller.threshold, 0, 0.75),
            softKnee: math.clamp(controller.softKnee, 0.01, 1),
            intensity: math.clamp(controller.intensity, 0, 4),
            blurRadius: math.clamp(controller.blurRadius, 0.25, 4),
            detailWeight: math.clamp01(controller.detailWeight),
            diagnosticGain: math.clamp(controller.diagnosticGain, 1, 6),
            exposure: math.clamp(controller.exposure, 0.1, 5),
            toneMode: controller.toneMode,
            manualSRGB: controller.manualSRGB,
        };
    }
    return {
        window, width, height, ...lesson11ScaledSizes(width, height),
        resources, resourcesReady, colorFormat, useHDR, fx,
    };
}
