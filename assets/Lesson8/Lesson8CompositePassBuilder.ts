import { gfx, rendering } from 'cc';
import { clearColorOf, fullViewport } from './Lesson8PipelineConfig';
import { Lesson8CameraConfig } from './Lesson8PipelineTypes';

export class Lesson8CompositePassBuilder {
    public static build(
        cfg: Lesson8CameraConfig,
        ppl: rendering.BasicPipeline,
        inputName: string,
    ): void {
        const fx = cfg.fx!;
        // Camera đầu tiên tạo nội dung đích. Camera sau có thể dùng alpha blend.
        const blend = !cfg.firstInWindow && fx.compositeWithAlpha;
        const passIndex = blend ? 2 : 1;
        const passName = blend ? 'lesson8-copy-alpha' : 'lesson8-copy-opaque';
        const clear = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);

        const pass = ppl.addRenderPass(cfg.width, cfg.height, passName);
        pass.setViewport(fullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(
            cfg.window.colorName,
            clear ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            clearColorOf(cfg.camera),
        );
        pass.addTexture(inputName, 'inputTexture');
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.material, passIndex);
    }
}
