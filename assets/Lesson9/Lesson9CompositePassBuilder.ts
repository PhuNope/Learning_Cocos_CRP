import { gfx, rendering } from 'cc';
import { cameraClearColor, viewport } from './Lesson9PipelineConfig';
import { Lesson9CameraConfig } from './Lesson9PipelineTypes';

export class Lesson9CompositePassBuilder {
    public static build(cfg: Lesson9CameraConfig, ppl: rendering.BasicPipeline, inputName: string): void {
        const bloom = cfg.bloom!;
        // Overlay: premultiplied RGB output từ pass 7; blend ONE / ONE_MINUS_SRC_ALPHA.
        const alphaBlend = !cfg.firstInWindow && bloom.compositeWithAlpha;
        const passIndex = alphaBlend ? 7 : 6;
        const passName = alphaBlend ? 'lesson9-copy-alpha' : 'lesson9-copy-opaque';
        const clear = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, passName);
        pass.setViewport(viewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.window.colorName,
            clear ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE, cameraClearColor(cfg.camera));
        pass.addTexture(inputName, 'inputTexture');
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(bloom.material, passIndex);
    }
}
