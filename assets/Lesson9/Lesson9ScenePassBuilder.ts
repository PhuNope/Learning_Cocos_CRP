import { gfx, renderer, rendering } from 'cc';
import { cameraClearColor, viewport } from './Lesson9PipelineConfig';
import { Lesson9CameraConfig } from './Lesson9PipelineTypes';

export class Lesson9ScenePassBuilder {
    /** Scene riêng cho Camera, không ảnh hưởng window.colorName. */
    public static buildOffscreen(cfg: Lesson9CameraConfig, ppl: rendering.BasicPipeline): string {
        const clear = cameraClearColor(cfg.camera);
        if (cfg.bloom!.transparentBackground) {
            clear.x = 0; clear.y = 0; clear.z = 0; clear.w = 0;
        }
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(viewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.resources.sceneColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clear);
        pass.addDepthStencil(cfg.resources.sceneDepth,
            gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD,
            cfg.camera.clearDepth, cfg.camera.clearStencil,
            gfx.ClearFlagBit.DEPTH_STENCIL);
        this.addQueues(pass, cfg.camera);
        return cfg.resources.sceneColor;
    }

    /** Không Bloom: vẽ trực tiếp vào window.colorName. */
    public static buildDirect(
        cfg: Lesson9CameraConfig,
        ppl: rendering.BasicPipeline,
        windowDepthReady: boolean,
    ): void {
        const clearColor = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const clearDepth = !windowDepthReady || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(cfg.viewport);
        pass.addRenderTarget(cfg.window.colorName,
            clearColor ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE, cameraClearColor(cfg.camera));
        if (clearDepth) {
            pass.addDepthStencil(cfg.window.depthStencilName,
                gfx.LoadOp.CLEAR, gfx.StoreOp.STORE,
                cfg.camera.clearDepth, cfg.camera.clearStencil,
                gfx.ClearFlagBit.DEPTH_STENCIL);
        } else {
            pass.addDepthStencil(cfg.window.depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }
        this.addQueues(pass, cfg.camera);
    }

    private static addQueues(pass: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera): void {
        const Q = rendering.QueueHint, S = rendering.SceneFlags;
        pass.addQueue(Q.OPAQUE).addScene(camera, S.OPAQUE);
        pass.addQueue(Q.MASK).addScene(camera, S.MASK);
        pass.addQueue(Q.BLEND).addScene(camera, S.BLEND | S.UI);
    }
}
