import { gfx, rendering, Vec4 } from 'cc';
import { lesson11FullViewport } from 'db://assets/Lesson11/Lesson11PipelineConfig';
import { Lesson11WindowConfig } from 'db://assets/Lesson11/Lesson11PipelineTypes';

export class Lesson11HDRBoostPassBuilder {
    public static build(cfg: Lesson11WindowConfig, ppl: rendering.BasicPipeline, input: string): string {
        const fx = cfg.fx;
        if (fx.diagnosticGain <= 1.001) return input;
        const p = ppl.addRenderPass(cfg.width, cfg.height, 'lesson11-hdr-boost');
        p.name = `L11 HDR Boost / Window ${cfg.window.renderWindowId}`;
        p.setViewport(lesson11FullViewport(cfg.width, cfg.height));
        p.addRenderTarget(cfg.resources.radiance, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, new gfx.Color(0, 0, 0, 0));
        p.addTexture(input, 'inputTexture');
        p.setVec4('boostParams', new Vec4(fx.diagnosticGain, 0, 0, 0));
        p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.hdrBloomMaterial, 0);
        return cfg.resources.radiance;
    }
}
