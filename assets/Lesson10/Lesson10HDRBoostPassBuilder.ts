import { gfx, rendering, Vec4 } from 'cc';
import { fullViewport } from 'db://assets/Lesson10/Lesson10PipelineConfig';
import { Lesson10CameraConfig } from 'db://assets/Lesson10/Lesson10PipelineTypes';

export class Lesson10HDRBoostPassBuilder {
    public static build(cfg: Lesson10CameraConfig, ppl: rendering.BasicPipeline, input: string): string {
        const pass = ppl.addRenderPass(cfg.width, cfg.height, 'lesson10-hdr-boost');
        pass.setViewport(fullViewport(cfg.width, cfg.height));
        pass.addRenderTarget(cfg.resources.radiance, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, new gfx.Color(0, 0, 0, 0));
        pass.addTexture(input, 'inputTexture');
        pass.setVec4('boostParams', new Vec4(cfg.fx!.diagnosticGain, 0, 0, 0));
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(cfg.fx!.material, 0);
        return cfg.resources.radiance;
    }
}
