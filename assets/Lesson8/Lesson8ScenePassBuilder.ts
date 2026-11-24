import { gfx, renderer, rendering } from 'cc';
import { clearColorOf, fullViewport } from './Lesson8PipelineConfig';
import { Lesson8CameraConfig } from './Lesson8PipelineTypes';

export class Lesson8ScenePassBuilder {
    public static buildOffscreen(cfg: Lesson8CameraConfig, ppl: rendering.BasicPipeline): string {
        const clear = clearColorOf(cfg.camera);
        if (cfg.fx!.transparentBackground) {
            clear.x = clear.y = clear.z = clear.w = 0;
        }

        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(fullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.resources.sceneColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clear);
        pass.addDepthStencil(
            cfg.resources.sceneDepth,
            gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD,
            cfg.camera.clearDepth, cfg.camera.clearStencil,
            gfx.ClearFlagBit.DEPTH_STENCIL,
        );
        this.addSceneQueues(pass, cfg.camera);
        return cfg.resources.sceneColor;
    }

    /** Fallback: không PostFX, vẽ thẳng vào RenderWindow. */
    public static buildDirect(
        cfg: Lesson8CameraConfig,
        ppl: rendering.BasicPipeline,
        windowDepthReady: boolean,
    ): void {
        const clearColor = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const clearDepth = !windowDepthReady || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'default');
        pass.setViewport(cfg.viewport);
        pass.addRenderTarget(
            cfg.window.colorName,
            clearColor ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            clearColorOf(cfg.camera),
        );
        if (clearDepth) {
            pass.addDepthStencil(
                cfg.window.depthStencilName,
                gfx.LoadOp.CLEAR, gfx.StoreOp.STORE,
                cfg.camera.clearDepth, cfg.camera.clearStencil,
                gfx.ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(
                cfg.window.depthStencilName,
                gfx.LoadOp.LOAD, gfx.StoreOp.STORE,
            );
        }
        this.addSceneQueues(pass, cfg.camera);
    }

    private static addSceneQueues(pass: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera): void {
        const Q = rendering.QueueHint;
        const S = rendering.SceneFlags;
        pass.addQueue(Q.OPAQUE).addScene(camera, S.OPAQUE);
        pass.addQueue(Q.MASK).addScene(camera, S.MASK);
        pass.addQueue(Q.BLEND).addScene(camera, S.BLEND | S.UI);
    }
}
