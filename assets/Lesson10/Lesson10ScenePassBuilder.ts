import { gfx, renderer, rendering } from 'cc';
import { cameraClearColor, fullViewport } from './Lesson10PipelineConfig';
import { Lesson10CameraConfig } from './Lesson10PipelineTypes';

/** ScenePass giữ thứ tự OPAQUE → MASK → BLEND/UI của Bài 9. */
export class Lesson10ScenePassBuilder {
    public static buildOffscreen(cfg: Lesson10CameraConfig, ppl: rendering.BasicPipeline): string {
        const clear = cameraClearColor(cfg.camera);
        if (cfg.fx!.transparentBackground) {
            clear.x = 0; clear.y = 0; clear.z = 0; clear.w = 0;
        }
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(fullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.resources.sceneColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clear);
        pass.addDepthStencil(cfg.resources.sceneDepth, gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD,
            cfg.camera.clearDepth, cfg.camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL);
        this.addQueues(pass, cfg.camera);
        return cfg.resources.sceneColor;
    }

    public static buildDirect(cfg: Lesson10CameraConfig, ppl: rendering.BasicPipeline, depthReady: boolean): void {
        const clearColor = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const clearDepth = !depthReady || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(cfg.viewport);
        pass.addRenderTarget(cfg.window.colorName,
            clearColor ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE, cameraClearColor(cfg.camera));
        if (clearDepth) {
            pass.addDepthStencil(cfg.window.depthStencilName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE,
                cfg.camera.clearDepth, cfg.camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL);
        } else {
            pass.addDepthStencil(cfg.window.depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }
        this.addQueues(pass, cfg.camera);
    }

    private static addQueues(pass: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera) {
        const Q = rendering.QueueHint, S = rendering.SceneFlags;
        pass.addQueue(Q.OPAQUE).addScene(camera, S.OPAQUE);
        pass.addQueue(Q.MASK).addScene(camera, S.MASK);
        pass.addQueue(Q.BLEND).addScene(camera, S.BLEND | S.UI);
    }
}
