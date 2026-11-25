import { gfx, renderer, rendering } from 'cc';
import { Lesson11CameraSettings } from 'db://assets/Lesson11/Lesson11CameraSettings';
import { lesson11CameraViewport, lesson11ClearColor } from 'db://assets/Lesson11/Lesson11PipelineConfig';
import { Lesson11WindowConfig } from 'db://assets/Lesson11/Lesson11PipelineTypes';

export class Lesson11ScenePassBuilder {
    public static buildShared(cfg: Lesson11WindowConfig, ppl: rendering.BasicPipeline, camera: renderer.scene.Camera, first: boolean, settings: Lesson11CameraSettings) {
        const p = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        p.name = `L11 Shared Scene / ${camera.node?.name || 'Camera'}`;
        p.setViewport(lesson11CameraViewport(camera, cfg.width, cfg.height));
        p.addRenderTarget(
            cfg.resources.sceneColor,
            first ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            first ? lesson11ClearColor(camera) : new gfx.Color(0, 0, 0, 0),
        );

        const clearDepth = first || !!settings?.clearDepthBeforeScene || !!(camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);
        if (clearDepth) {
            p.addDepthStencil(cfg.resources.sceneDepth, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE,
                camera.clearDepth, camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL);
        } else {
            p.addDepthStencil(cfg.resources.sceneDepth, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }
        this.addQueues(p, camera);
    }

    public static buildDirect(ppl: rendering.BasicPipeline, camera: renderer.scene.Camera, firstColorInWindow: boolean, depthInitialized: boolean, preservePreviousColor = false) {
        const window = camera.window;
        const width = Math.max(1, Math.floor(window.width));
        const height = Math.max(1, Math.floor(window.height));
        const p = ppl.addRenderPass(width, height, 'default');
        p.name = `L11 After Tonemap / ${camera.node?.name || 'Camera'}`;
        p.setViewport(lesson11CameraViewport(camera, width, height));
        const clearColor = firstColorInWindow || (!preservePreviousColor && !!(camera.clearFlag & gfx.ClearFlagBit.COLOR));
        p.addRenderTarget(window.colorName, clearColor ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD, gfx.StoreOp.STORE, lesson11ClearColor(camera));
        const clearDepth = !depthInitialized || !!(camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);
        if (clearDepth) {
            p.addDepthStencil(window.depthStencilName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, camera.clearDepth, camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL);
        } else {
            p.addDepthStencil(window.depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }
        this.addQueues(p, camera);
    }

    private static addQueues(p: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera): void {
        const Q = rendering.QueueHint;
        const S = rendering.SceneFlags;
        p.addQueue(Q.OPAQUE).addScene(camera, S.OPAQUE);
        p.addQueue(Q.MASK).addScene(camera, S.MASK);
        p.addQueue(Q.BLEND).addScene(camera, S.BLEND | S.UI);
    }
}
