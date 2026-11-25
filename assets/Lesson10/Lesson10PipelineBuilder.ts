import { gfx, renderer, rendering } from 'cc';
import { Lesson10BloomPassBuilder } from 'db://assets/Lesson10/Lesson10BloomPassBuilder';
import { Lesson10HDRBoostPassBuilder } from 'db://assets/Lesson10/Lesson10HDRBoostPassBuilder';
import { collectCameraConfig, LESSON10_OPTIONS } from 'db://assets/Lesson10/Lesson10PipelineConfig';
import { registerLesson10Resources } from 'db://assets/Lesson10/Lesson10ResourceRegistry';
import { Lesson10ScenePassBuilder } from 'db://assets/Lesson10/Lesson10ScenePassBuilder';
import { Lesson10ToneMapPassBuilder } from 'db://assets/Lesson10/Lesson10ToneMapPassBuilder';

export class Lesson10PipelineBuilder implements rendering.PipelineBuilder {
    private frame = 0;

    public windowResize(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, width: number, height: number): void {
        registerLesson10Resources(pipeline, window, camera, width, height);
    }

    public setup(cameras: renderer.scene.Camera[], ppl: rendering.BasicPipeline): void {
        const visitedWindows = new Set<renderer.RenderWindow>();
        const initializedWindowDepth = new Set<renderer.RenderWindow>();
        const debug = this.frame < LESSON10_OPTIONS.debugFirstFrames;

        for (const camera of cameras) {
            if (!camera.scene || !camera.window || !camera.node) continue;

            const firstInWindow = !visitedWindows.has(camera.window);
            visitedWindows.add(camera.window);
            const cfg = collectCameraConfig(camera, ppl, firstInWindow);

            if (cfg.applyPost && cfg.fx) {
                const scene = Lesson10ScenePassBuilder.buildOffscreen(cfg, ppl);
                const radiance = Lesson10HDRBoostPassBuilder.build(cfg, ppl, scene);
                const combined = cfg.fx.enableBloom ? Lesson10BloomPassBuilder.build(cfg, ppl, radiance) : radiance;
                Lesson10ToneMapPassBuilder.build(cfg, ppl, radiance, combined);
            } else {
                Lesson10ScenePassBuilder.buildDirect(cfg, ppl, initializedWindowDepth.has(cfg.window));
                initializedWindowDepth.add(cfg.window);
            }

            if (debug) {
                console.log('[Lesson10:Route]', {
                    camera: camera.node.name,
                    windowId: cfg.window.renderWindowId,
                    fmt: cfg.useHDR ? 'RGBA16F' : 'RGBA8 fallback',
                    firstInWindow: cfg.firstInWindow,
                    resourcesReady: cfg.resourcesReady,
                    fullViewport: cfg.fullViewport,
                    applyPost: cfg.applyPost,
                    bloom: cfg.fx?.enableBloom ?? false,
                    threshold: cfg.fx?.threshold ?? null,
                    exposure: cfg.fx?.exposure ?? null,
                });
                if (cfg.applyPost && cfg.fx?.compositeWithAlpha && !firstInWindow
                    && !!(camera.clearFlag & gfx.ClearFlagBit.COLOR)) {
                    console.warn('[Lesson10] Overlay CLEAR COLOR sẽ xóa kết quả World trước khi blend:', camera.node.name);
                }
            }
        }

        this.frame++;
    }

}

const BUILDER = new Lesson10PipelineBuilder();
if (rendering) rendering.setCustomPipeline('LearnCRP', BUILDER);