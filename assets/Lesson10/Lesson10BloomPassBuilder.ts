import { gfx, rendering, Vec4 } from 'cc';
import { fullViewport } from './Lesson10PipelineConfig';
import { Lesson10CameraConfig } from './Lesson10PipelineTypes';

/** 6 pass Bloom trong miền radiance, trước tone mapping. */
export class Lesson10BloomPassBuilder {
    private static readonly BLACK = new gfx.Color(0, 0, 0, 0);
    private static texel(w: number, h: number, z = 0): Vec4 {
        return new Vec4(1 / Math.max(1, w), 1 / Math.max(1, h), z, 0);
    }

    public static build(cfg: Lesson10CameraConfig, ppl: rendering.BasicPipeline, sceneInput: string): string {
        const r = cfg.resources;
        const fx = cfg.fx!;
        const mat = fx.material;
        const hw = cfg.halfWidth, hh = cfg.halfHeight;
        const qw = cfg.quarterWidth, qh = cfg.quarterHeight;

        // Index 1: HDR prefilter: radiance → halfBright.
        {
            const pass = ppl.addRenderPass(hw, hh, 'lesson10-prefilter');
            pass.setViewport(fullViewport(hw, hh));
            pass.addRenderTarget(r.halfBright, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(sceneInput, 'inputTexture');
            pass.setVec4('bloomParams', new Vec4(fx.threshold, fx.softKnee, 0, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 1);
        }
        // Index 2: halfBright → quarterDown.
        {
            const pass = ppl.addRenderPass(qw, qh, 'lesson10-downsample');
            pass.setViewport(fullViewport(qw, qh));
            pass.addRenderTarget(r.quarterDown, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.halfBright, 'inputTexture');
            pass.setVec4('sourceTexel', this.texel(hw, hh));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 2);
        }
        // Index 3: quarterDown → quarterBlurH.
        {
            const pass = ppl.addRenderPass(qw, qh, 'lesson10-blur-h');
            pass.setViewport(fullViewport(qw, qh));
            pass.addRenderTarget(r.quarterBlurH, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.quarterDown, 'inputTexture');
            pass.setVec4('blurParams', this.texel(qw, qh, fx.blurRadius));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 3);
        }
        // Index 4: quarterBlurH → quarterBlurV.
        {
            const pass = ppl.addRenderPass(qw, qh, 'lesson10-blur-v');
            pass.setViewport(fullViewport(qw, qh));
            pass.addRenderTarget(r.quarterBlurV, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.quarterBlurH, 'inputTexture');
            pass.setVec4('blurParams', this.texel(qw, qh, fx.blurRadius));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 4);
        }
        // Index 5: quarterBlurV + halfBright → halfBloom.
        {
            const pass = ppl.addRenderPass(hw, hh, 'lesson10-upsample');
            pass.setViewport(fullViewport(hw, hh));
            pass.addRenderTarget(r.halfBloom, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.quarterBlurV, 'inputTexture');
            pass.addTexture(r.halfBright, 'detailTexture');
            pass.setVec4('upParams', new Vec4(fx.detailWeight, 0, 0, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 5);
        }
        // Index 6: radiance + halfBloom → combined (giữ HDR, không clamp 0..1!).
        {
            const pass = ppl.addRenderPass(cfg.width, cfg.height, 'lesson10-combine');
            pass.setViewport(fullViewport(cfg.width, cfg.height));
            pass.addRenderTarget(r.combined, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(sceneInput, 'inputTexture');
            pass.addTexture(r.halfBloom, 'bloomTexture');
            pass.setVec4('combineParams', new Vec4(fx.intensity, 0, 0, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 6);
        }
        return r.combined;
    }
}
