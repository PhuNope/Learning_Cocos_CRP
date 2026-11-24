import { gfx, renderer, rendering, Vec4 } from 'cc';
import {
    cameraResources,
    collectCameraConfig,
    collectPipelineConfig,
    LESSON7_GLOBAL,
    makeFullViewport,
} from 'db://assets/Lesson7/Lesson7PipelineConfig';
import { Lesson7CameraConfig } from './Lesson7PipelineTypes';

export class Lesson7PipelineBuilder implements rendering.PipelineBuilder {
    private frameLogged = 0;

    windowResize(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, nativeWidth: number, nativeHeight: number): void {
        const width = Math.max(1, Math.floor(nativeWidth));
        const height = Math.max(1, Math.floor(nativeHeight));
        pipeline.addRenderWindow(window.colorName, gfx.Format.RGBA8, width, height, window, window.depthStencilName);
        if (!camera.node) return;

        const r = cameraResources(camera);
        pipeline.addRenderTarget(r.sceneColor, gfx.Format.RGBA8, width, height);
        pipeline.addDepthStencil(r.sceneDepth, gfx.Format.DEPTH_STENCIL, width, height);
        pipeline.addRenderTarget(r.fxColor, gfx.Format.RGBA8, width, height);
        console.log('[Lesson7:Resize]', {
            camera: camera.node.name, windowId: window.renderWindowId,
            size: `${width}x${height}`, resources: r,
        });
    }

    setup(cameras: renderer.scene.Camera[], pipeline: rendering.BasicPipeline): void {
        const verbose = this.frameLogged < LESSON7_GLOBAL.debugFirstFrames;
        const pipelineConfig = collectPipelineConfig(pipeline, verbose);
        const visitedWindows = new Set<renderer.RenderWindow>();
        const windowDepthInitialized = new Set<renderer.RenderWindow>();

        for (const camera of cameras) {
            if (!camera.scene || !camera.window || !camera.node) continue;

            const first = !visitedWindows.has(camera.window);
            visitedWindows.add(camera.window);
            const cfg = collectCameraConfig(camera, pipeline, pipelineConfig, first);

            if (cfg.applyPost && cfg.fx) {
                this.buildOffscreenScene(cfg, pipeline);
                this.buildFX(cfg, pipeline);
                this.buildComposite(cfg, pipeline);
            } else {
                this.buildDirectScene(cfg, pipeline, windowDepthInitialized.has(cfg.window));
                windowDepthInitialized.add(cfg.window);
            }

            if (verbose) {
                console.log('[Lesson7:Route]', {
                    camera: camera.node.name,
                    windowId: cfg.window.renderWindowId,
                    graphicsAPI: pipelineConfig.graphicsAPI,
                    firstInWindow: cfg.firstInWindow,
                    applyPost: cfg.applyPost,
                    resourcesReady: cfg.resourcesReady,
                    fullViewport: cfg.fullViewport,
                    route: cfg.applyPost ? 'SceneColor -> FXColor -> Window' : 'Direct -> Window',
                });
            }
        }

        this.frameLogged++;
    }

    private buildOffscreenScene(cfg: Lesson7CameraConfig, ppl: rendering.BasicPipeline): void {
        const fx = cfg.fx!;
        const clear = this.cameraClearColor(cfg.camera);
        if (fx.transparentBackground) {
            clear.x = clear.y = clear.z = clear.w = 0;
        }
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(makeFullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.resources.sceneColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clear);
        pass.addDepthStencil(
            cfg.resources.sceneDepth, gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD,
            cfg.camera.clearDepth, cfg.camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL,
        );
        this.addSceneQueues(pass, cfg.camera);
    }

    private buildFX(cfg: Lesson7CameraConfig, ppl: rendering.BasicPipeline): void {
        const fx = cfg.fx!;
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'lesson7-fx');
        pass.setViewport(makeFullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.resources.fxColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, new gfx.Color(0, 0, 0, 0));
        pass.addTexture(cfg.resources.sceneColor, 'inputTexture');
        pass.setVec4('fxParams', new Vec4(fx.effectMode, fx.strength, 0, 0));
        const tint = fx.tintColor;
        pass.setVec4('fxTint', new Vec4(tint.r / 255, tint.g / 255, tint.b / 255, tint.a / 255));
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.material, 0);
    }

    private buildComposite(cfg: Lesson7CameraConfig, ppl: rendering.BasicPipeline): void {
        const fx = cfg.fx!;
        const blend = !cfg.firstInWindow && fx.compositeWithAlpha;
        const passIndex = blend ? 2 : 1;
        const passName = blend ? 'lesson7-copy-alpha' : 'lesson7-copy-opaque';
        const clearColor = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, passName);
        pass.setViewport(makeFullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(
            cfg.window.colorName,
            clearColor ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            this.cameraClearColor(cfg.camera),
        );
        pass.addTexture(cfg.resources.fxColor, 'inputTexture');
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.material, passIndex);
    }

    private buildDirectScene(cfg: Lesson7CameraConfig, ppl: rendering.BasicPipeline, depthWasInitialized: boolean): void {
        const colorClear = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const depthClear = !depthWasInitialized || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(cfg.viewport);
        pass.addRenderTarget(
            cfg.window.colorName,
            colorClear ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            this.cameraClearColor(cfg.camera),
        );
        if (depthClear) {
            pass.addDepthStencil(
                cfg.window.depthStencilName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE,
                cfg.camera.clearDepth, cfg.camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(cfg.window.depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }
        this.addSceneQueues(pass, cfg.camera);
    }

    private cameraClearColor(camera: renderer.scene.Camera): gfx.Color {
        const c = camera.clearColor;
        return new gfx.Color(c.x, c.y, c.z, c.w);
    }

    private addSceneQueues(pass: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera): void {
        const S = rendering.SceneFlags;
        const H = rendering.QueueHint;
        pass.addQueue(H.OPAQUE).addScene(camera, S.OPAQUE);
        pass.addQueue(H.MASK).addScene(camera, S.MASK);
        pass.addQueue(H.BLEND).addScene(camera, S.BLEND | S.UI);
    }
}

// const BUILDER = new Lesson7PipelineBuilder();
// if (rendering) {
//     rendering.setCustomPipeline('LearnCRP', BUILDER);
// }