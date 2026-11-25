import { gfx, renderer, rendering } from 'cc';
import { collectCameraConfig, LESSON9_OPTIONS } from './Lesson9PipelineConfig';
import { registerCameraResources } from './Lesson9ResourceRegistry';
import { Lesson9ScenePassBuilder } from './Lesson9ScenePassBuilder';
import { Lesson9BloomPassBuilder } from './Lesson9BloomPassBuilder';
import { Lesson9CompositePassBuilder } from './Lesson9CompositePassBuilder';

/** Chỉ điều phối builder, không tự tạo pass ở đây. */
export class Lesson9PipelineBuilder implements rendering.PipelineBuilder {
    private frameNumber = 0;

    public windowResize(
        ppl: rendering.BasicPipeline,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number,
    ): void {
        registerCameraResources(ppl, window, camera, nativeWidth, nativeHeight);
    }

    public setup(cameras: renderer.scene.Camera[], ppl: rendering.BasicPipeline): void {
        const seenColor = new Set<renderer.RenderWindow>();
        const seenDepth = new Set<renderer.RenderWindow>();
        const debug = this.frameNumber < LESSON9_OPTIONS.debugFirstFrames;

        for (const camera of cameras) {
            if (!camera.scene || !camera.window || !camera.node) continue;
            const firstInWindow = !seenColor.has(camera.window);
            seenColor.add(camera.window);
            const cfg = collectCameraConfig(camera, ppl, firstInWindow);

            if (cfg.applyBloom && cfg.bloom) {
                const sceneInput = Lesson9ScenePassBuilder.buildOffscreen(cfg, ppl);
                const bloomOutput = Lesson9BloomPassBuilder.build(cfg, ppl, sceneInput);
                Lesson9CompositePassBuilder.build(cfg, ppl, bloomOutput);
                // Cố ý không dùng window.depthStencilName trên đường Offscreen.
            } else {
                Lesson9ScenePassBuilder.buildDirect(cfg, ppl, seenDepth.has(cfg.window));
                seenDepth.add(cfg.window);
            }

            if (debug) {
                console.log('[Lesson9:Route]', {
                    camera: camera.node.name,
                    windowId: cfg.window.renderWindowId,
                    firstInWindow, resourcesReady: cfg.resourcesReady,
                    fullViewport: cfg.fullViewport, applyBloom: cfg.applyBloom,
                    resolution: `${cfg.width}x${cfg.height}`,
                    bloom: cfg.bloom ? {
                        threshold: cfg.bloom.threshold,
                        intensity: cfg.bloom.intensity,
                        alphaBlend: cfg.bloom.compositeWithAlpha,
                    } : null,
                });
                if (cfg.applyBloom && cfg.bloom?.compositeWithAlpha && !firstInWindow
                    && !!(camera.clearFlag & gfx.ClearFlagBit.COLOR)) {
                    console.warn('[Lesson9] Overlay Clear Color sẽ xóa World trước khi alpha composite:', camera.node.name);
                }
            }
        }
        this.frameNumber++;
    }
}

// Chỉ bật MỘT module đăng ký tên LearnCRP trong cả project.
// const BUILDER = new Lesson9PipelineBuilder();
// if (rendering) rendering.setCustomPipeline('LearnCRP', BUILDER);
