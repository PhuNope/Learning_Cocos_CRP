import { gfx, renderer, rendering } from 'cc';
import { collectCameraConfig, collectPipelineConfig, LESSON8_OPTIONS } from './Lesson8PipelineConfig';
import { registerCameraResources } from './Lesson8ResourceRegistry';
import { Lesson8ScenePassBuilder } from './Lesson8ScenePassBuilder';
import { Lesson8PostFXPassBuilder } from './Lesson8PostFXPassBuilder';
import { Lesson8CompositePassBuilder } from './Lesson8CompositePassBuilder';

/**
 * Chỉ orchestrate các builder. Không trực tiếp addRenderPass trong class này.
 * CHỈ file này đăng ký LearnCRP. Xóa / vô hiệu script cũ của Bài 1-7.
 */
export class Lesson8PipelineBuilder implements rendering.PipelineBuilder {
    private framesLogged = 0;

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
        const debug = this.framesLogged < LESSON8_OPTIONS.debugFirstFrames;
        const pipelineConfig = collectPipelineConfig(ppl, debug);
        const seenColor = new Set<renderer.RenderWindow>();
        const seenDepth = new Set<renderer.RenderWindow>();

        for (const camera of cameras) {
            if (!camera.scene || !camera.window || !camera.node) continue;
            const firstInWindow = !seenColor.has(camera.window);
            seenColor.add(camera.window);
            const cfg = collectCameraConfig(camera, ppl, pipelineConfig, firstInWindow);

            if (cfg.applyPost && cfg.fx) {
                const sceneInput = Lesson8ScenePassBuilder.buildOffscreen(cfg, ppl);
                const postOutput = Lesson8PostFXPassBuilder.buildChain(cfg, ppl, sceneInput);
                Lesson8CompositePassBuilder.build(cfg, ppl, postOutput);
                // Offscreen Depth KHÔNG cập nhật Window Depth.
            } else {
                Lesson8ScenePassBuilder.buildDirect(cfg, ppl, seenDepth.has(cfg.window));
                seenDepth.add(cfg.window);
            }

            if (debug) {
                console.log('[Lesson8:Route]', {
                    camera: camera.node.name,
                    windowId: cfg.window.renderWindowId,
                    firstInWindow: cfg.firstInWindow,
                    graphicsAPI: pipelineConfig.graphicsAPI,
                    resourceReady: cfg.resourcesReady,
                    fullViewport: cfg.fullViewport,
                    post: cfg.applyPost,
                    stages: cfg.fx ? cfg.fx.stages.map(s => s.mode) : [],
                    route: cfg.applyPost ? 'Scene -> FX(A) [-> FX(B)] -> Composite' : 'Direct Scene',
                });
                if (cfg.applyPost && cfg.fx && cfg.fx.compositeWithAlpha
                    && !cfg.firstInWindow && !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR)) {
                    console.warn('[Lesson8] Camera bật Alpha Composite nhưng Clear Color sẽ xóa Window trước khi blend:', camera.node.name);
                }
            }
        }
        this.framesLogged++;
    }
}

const BUILDER = new Lesson8PipelineBuilder();
if (rendering) {
    rendering.setCustomPipeline('LearnCRP', BUILDER);
}
