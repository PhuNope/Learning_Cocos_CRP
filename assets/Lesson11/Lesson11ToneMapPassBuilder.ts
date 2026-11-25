import { gfx, rendering, Vec4 } from 'cc';
import { lesson11FullViewport } from 'db://assets/Lesson11/Lesson11PipelineConfig';
import { Lesson11WindowConfig } from 'db://assets/Lesson11/Lesson11PipelineTypes';

export class Lesson11ToneMapPassBuilder {
    public static build(cfg: Lesson11WindowConfig, ppl: rendering.BasicPipeline, input: string) {
        const fx = cfg.fx!;
        const p = ppl.addRenderPass(cfg.width, cfg.height, 'lesson11-tonemap');
        p.name = `L11 ToneMap / Window ${cfg.window.renderWindowId}`;
        p.setViewport(lesson11FullViewport(cfg.width, cfg.height));
        p.addRenderTarget(cfg.window.colorName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, new gfx.Color(0, 0, 0, 1));
        p.addTexture(input, 'inputTexture');
        p.setVec4('toneParams', new Vec4(fx.exposure, fx.toneMode, fx.manualSRGB ? 1 : 0, 0));
        p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.toneMapMaterial, 0);
    }
}
