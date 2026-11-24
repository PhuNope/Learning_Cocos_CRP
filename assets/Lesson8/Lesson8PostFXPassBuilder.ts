import { gfx, rendering, Vec4 } from 'cc';
import { fullViewport } from './Lesson8PipelineConfig';
import { Lesson8CameraConfig } from './Lesson8PipelineTypes';

export class Lesson8PostFXPassBuilder {
    public static buildChain(
        cfg: Lesson8CameraConfig,
        ppl: rendering.BasicPipeline,
        sceneInput: string,
    ): string {
        const fx = cfg.fx!;
        let input = sceneInput;
        const tint = fx.tintColor;
        const tintUniform = new Vec4(tint.r / 255, tint.g / 255, tint.b / 255, tint.a / 255);

        for (let i = 0; i < fx.stages.length; i++) {
            const stage = fx.stages[i];
            const output = i === 0 ? cfg.resources.fxA : cfg.resources.fxB;
            if (input === output) {
                throw new Error(`[Lesson8] PostFX read/write collision: ${input}`);
            }

            const pass = ppl.addRenderPass(cfg.width, cfg.height, 'lesson8-fx');
            pass.setViewport(fullViewport(cfg.width, cfg.height));
            pass.addRenderTarget(output, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, new gfx.Color(0, 0, 0, 0));
            pass.addTexture(input, 'inputTexture');
            pass.setVec4('fxParams', new Vec4(stage.mode, stage.strength, 0, 0));
            pass.setVec4('fxTint', tintUniform);
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.material, 0);
            input = output;
        }
        return input;
    }
}
