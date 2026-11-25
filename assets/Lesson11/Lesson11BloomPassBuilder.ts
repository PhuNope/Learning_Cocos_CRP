import { gfx, rendering, Vec4 } from 'cc';
import { lesson11FullViewport } from './Lesson11PipelineConfig';
import { Lesson11WindowConfig } from './Lesson11PipelineTypes';

/** 6 fullscreen pass của Bloom, mỗi Window chạy nhiều nhất một chuỗi. */
export class Lesson11BloomPassBuilder {
    private static readonly BLACK = new gfx.Color(0, 0, 0, 0);

    private static texel(w: number, h: number, radius = 0): Vec4 {
        return new Vec4(1 / Math.max(1, w), 1 / Math.max(1, h), radius, 0);
    }

    public static build(cfg: Lesson11WindowConfig, ppl: rendering.BasicPipeline, sceneInput: string): string {
        const r = cfg.resources;
        const fx = cfg.fx!;
        const mat = fx.hdrBloomMaterial;
        const hw = cfg.halfWidth, hh = cfg.halfHeight;
        const qw = cfg.quarterWidth, qh = cfg.quarterHeight;
        const prefix = `L11 W${cfg.window.renderWindowId}`;

        // 1. Prefilter: full -> half.
        {
            const p = ppl.addRenderPass(hw, hh, 'lesson11-prefilter');
            p.name = `${prefix} / Bloom Prefilter`;
            p.setViewport(lesson11FullViewport(hw, hh));
            p.addRenderTarget(r.halfBright, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            p.addTexture(sceneInput, 'inputTexture');
            p.setVec4('bloomParams', new Vec4(fx.threshold, fx.softKnee, 0, 0));
            p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 1);
        }
        // 2. Downsample: half -> quarter.
        {
            const p = ppl.addRenderPass(qw, qh, 'lesson11-downsample');
            p.name = `${prefix} / Bloom Downsample`;
            p.setViewport(lesson11FullViewport(qw, qh));
            p.addRenderTarget(r.quarterDown, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            p.addTexture(r.halfBright, 'inputTexture');
            p.setVec4('sourceTexel', this.texel(hw, hh));
            p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 2);
        }
        // 3. Horizontal Blur.
        {
            const p = ppl.addRenderPass(qw, qh, 'lesson11-blur-h');
            p.name = `${prefix} / Bloom Blur H`;
            p.setViewport(lesson11FullViewport(qw, qh));
            p.addRenderTarget(r.quarterBlurH, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            p.addTexture(r.quarterDown, 'inputTexture');
            p.setVec4('blurParams', this.texel(qw, qh, fx.blurRadius));
            p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 3);
        }
        // 4. Vertical Blur.
        {
            const p = ppl.addRenderPass(qw, qh, 'lesson11-blur-v');
            p.name = `${prefix} / Bloom Blur V`;
            p.setViewport(lesson11FullViewport(qw, qh));
            p.addRenderTarget(r.quarterBlurV, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            p.addTexture(r.quarterBlurH, 'inputTexture');
            p.setVec4('blurParams', this.texel(qw, qh, fx.blurRadius));
            p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 4);
        }
        // 5. Upsample quarter + half detail -> half bloom.
        {
            const p = ppl.addRenderPass(hw, hh, 'lesson11-upsample');
            p.name = `${prefix} / Bloom Upsample`;
            p.setViewport(lesson11FullViewport(hw, hh));
            p.addRenderTarget(r.halfBloom, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            p.addTexture(r.quarterBlurV, 'inputTexture');
            p.addTexture(r.halfBright, 'detailTexture');
            p.setVec4('upParams', new Vec4(fx.detailWeight, 0, 0, 0));
            p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 5);
        }
        // 6. Combine radiance + bloom (không clamp nếu output đang HDR16F).
        {
            const p = ppl.addRenderPass(cfg.width, cfg.height, 'lesson11-combine');
            p.name = `${prefix} / Bloom Combine`;
            p.setViewport(lesson11FullViewport(cfg.width, cfg.height));
            p.addRenderTarget(r.combined, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            p.addTexture(sceneInput, 'inputTexture');
            p.addTexture(r.halfBloom, 'bloomTexture');
            p.setVec4('combineParams', new Vec4(fx.intensity, 0, 0, 0));
            p.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(mat, 6);
        }
        return r.combined;
    }
}
