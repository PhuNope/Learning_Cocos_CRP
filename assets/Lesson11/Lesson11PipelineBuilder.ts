import { renderer, rendering } from 'cc';
import { Lesson11CameraSettings, Lesson11CameraStage } from 'db://assets/Lesson11/Lesson11CameraSettings';
import { LESSON11_OPTIONS, lesson11WindowConfig } from 'db://assets/Lesson11/Lesson11PipelineConfig';
import { registerLesson11Resources } from 'db://assets/Lesson11/Lesson11ResourceRegistry';
import { Lesson11ScenePassBuilder } from 'db://assets/Lesson11/Lesson11ScenePassBuilder';
import { Lesson11HDRBoostPassBuilder } from './Lesson11HDRBoostPassBuilder';
import { Lesson11BloomPassBuilder } from './Lesson11BloomPassBuilder';
import { Lesson11ToneMapPassBuilder } from './Lesson11ToneMapPassBuilder';

type CameraItem = {
    camera: renderer.scene.Camera;
    settings: Lesson11CameraSettings | null;
};

export class Lesson11PipelineBuilder implements rendering.PipelineBuilder {
    private frame = 0;

    public windowResize(
        ppl: rendering.BasicPipeline,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number,
    ): void {
        registerLesson11Resources(ppl, window, nativeWidth, nativeHeight);
    }

    public setup(cameras: renderer.scene.Camera[], ppl: rendering.BasicPipeline): void {
        const grouped = new Map<renderer.RenderWindow, CameraItem[]>();
        const debug = this.frame < LESSON11_OPTIONS.debugFirstFrames;
        for (const camera of cameras) {
            if (!camera.scene || !camera.window || !camera.node) continue;
            let items = grouped.get(camera.window);
            if (!items) {
                items = [];
                grouped.set(camera.window, items);
            }
            items.push({ camera, settings: camera.node.getComponent(Lesson11CameraSettings) });
        }

        for (const [window, items] of grouped) {
            const before = items.filter(item => !!item.settings?.enabledInHierarchy && item.settings.stage === Lesson11CameraStage.BEFORE_BLOOM);
            const after = items.filter(item => !before.includes(item));
            const controllers = before.filter(item => !!item.settings?.isWindowController);
            const controller = controllers.length ? controllers[0].settings! : null;
            const cfg = controller ? lesson11WindowConfig(window, ppl, controller) : null;
            const useWindowPost = before.length > 0 && !!cfg?.fx;

            if (debug && controllers.length > 1) {
                console.warn('[Lesson11] Có nhiều Window Controller. Chỉ dùng Camera đầu tiên:',
                    window.renderWindowId, controllers.map(item => item.camera.node?.name));
            }
            if (useWindowPost && cfg) {
                // 1. Camera BEFORE_BLOOM cùng ghi vào một Shared SceneColor + Shared Depth.
                before.forEach((item, i) => {
                    Lesson11ScenePassBuilder.buildShared(cfg, ppl, item.camera, i === 0, item.settings);
                });

                // 2. Radiance boost (tùy chọn) -> Bloom (tùy chọn) -> ToneMap, mỗi Window 1 lần.
                const scene = cfg.resources.sceneColor;
                const radiance = Lesson11HDRBoostPassBuilder.build(cfg, ppl, scene);
                const combined = cfg.fx!.enableBloom
                    ? Lesson11BloomPassBuilder.build(cfg, ppl, radiance)
                    : radiance;
                Lesson11ToneMapPassBuilder.build(cfg, ppl, combined);

                // 3. Camera AFTER_TONEMAP (UI) ghi vào window.colorName, LOAD ảnh vừa tone map.
                // Có chủ đích đưa tất cả Camera AFTER ra sau PostFX, dù mảng đầu vào xen kẽ.
                let depthInitialized = false;
                for (const item of after) {
                    Lesson11ScenePassBuilder.buildDirect(ppl, item.camera, false, depthInitialized, true);
                    depthInitialized = true;
                }
            } else {
                // Không có Controller/Material/resource: luôn fallback trực tiếp, giữ thứ tự Camera.
                let seenColor = false;
                let depthInitialized = false;
                for (const item of items) {
                    Lesson11ScenePassBuilder.buildDirect(
                        ppl, item.camera, !seenColor, depthInitialized, false);
                    seenColor = true;
                    depthInitialized = true;
                }
            }

            if (debug) {
                console.log('[Lesson11:WindowRoute]', {
                    windowId: window.renderWindowId,
                    cameras: items.map(item => item.camera.node?.name),
                    pre: before.map(item => item.camera.node?.name),
                    after: after.map(item => item.camera.node?.name),
                    controller: controllers[0]?.camera.node?.name || 'none',
                    route: useWindowPost ? 'Shared Scene -> HDR/Bloom -> ToneMap -> AFTER' : 'Direct fallback',
                    resourcesReady: cfg?.resourcesReady ?? false,
                    format: cfg?.useHDR ? 'RGBA16F' : 'RGBA8',
                    bloomChains: useWindowPost && !!cfg?.fx?.enableBloom ? 1 : 0,
                    estimatedPassCount: useWindowPost && cfg?.fx
                        ? before.length + (cfg.fx.diagnosticGain > 1.001 ? 1 : 0)
                        + (cfg.fx.enableBloom ? 6 : 0) + 1 + after.length
                        : items.length,
                });
            }
        }
        this.frame++;
    }
}

const L11_BUILDER = new Lesson11PipelineBuilder();
if (rendering) {
    rendering.setCustomPipeline('LearnCRP', L11_BUILDER);
}
