import { gfx, rendering, Vec4 } from 'cc';
import { viewport } from 'db://assets/Lesson9/Lesson9PipelineConfig';
import { Lesson9CameraConfig } from 'db://assets/Lesson9/Lesson9PipelineTypes';

export class Lesson9BloomPassBuilder {
    private static readonly BLACK = new gfx.Color(0, 0, 0, 0);

    private static texel(w: number, h: number, z = 0): Vec4 {
        return new Vec4(1 / Math.max(1, w), 1 / Math.max(1, h), z, 0);
    }

    public static build(cfg: Lesson9CameraConfig, ppl: rendering.BasicPipeline, sceneInput: string): string {
        const r = cfg.resources;
        const fx = cfg.bloom;
        const material = fx.material;
        const hw = cfg.halfWidth, hh = cfg.halfHeight;
        const qw = cfg.quarterWidth, qh = cfg.quarterHeight;

        // Pass 0: PREFILTER, full SceneColor -> halfBright.
        {
            const pass = ppl.addRenderPass(hw, hh, 'lesson9-prefilter');
            pass.setViewport(viewport(hw, hh));
            pass.addRenderTarget(r.halfBright, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(sceneInput, 'inputTexture');
            pass.setVec4('bloomParams', new Vec4(fx.threshold, fx.softKnee, 0, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(material, 0);
        }

        // Pass 1: DOWNSAMPLE. halfBright -> quarterDown.
        {
            const pass = ppl.addRenderPass(qw, qh, 'lesson9-downsample');
            pass.setViewport(viewport(qw, qh));
            pass.addRenderTarget(r.quarterDown, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.halfBright, 'inputTexture');
            pass.setVec4('sourceTexel', this.texel(hw, hh));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(material, 1);
        }

        // Pass 2: BLUR H. quarterDown -> quarterBlurH.
        {
            const pass = ppl.addRenderPass(qw, qh, 'lesson9-blur-h');
            pass.setViewport(viewport(qw, qh));
            pass.addRenderTarget(r.quarterBlurH, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.quarterDown, 'inputTexture');
            pass.setVec4('blurParams', this.texel(qw, qh, fx.blurRadius));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(material, 2);
        }

        // Pass 3: BLUR V. quarterBlurH -> quarterBlurV.
        {
            const pass = ppl.addRenderPass(qw, qh, 'lesson9-blur-v');
            pass.setViewport(viewport(qw, qh));
            pass.addRenderTarget(r.quarterBlurV, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.quarterBlurH, 'inputTexture');
            pass.setVec4('blurParams', this.texel(qw, qh, fx.blurRadius));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(material, 3);
        }

        // Pass 4: UPSAMPLE + DETAIL. quarterBlurV + halfBright -> halfBloom.
        {
            const pass = ppl.addRenderPass(hw, hh, 'lesson9-upsample');
            pass.setViewport(viewport(hw, hh));
            pass.addRenderTarget(r.halfBloom, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(r.quarterBlurV, 'inputTexture');
            pass.addTexture(r.halfBright, 'detailTexture');
            pass.setVec4('upParams', new Vec4(fx.detailWeight, 0, 0, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(material, 4);
        }

        // Pass 5: COMBINE. sceneColor + halfBloom -> combined (full size).
        {
            const pass = ppl.addRenderPass(cfg.width, cfg.height, 'lesson9-combine');
            pass.setViewport(viewport(cfg.width, cfg.height));
            pass.addRenderTarget(r.combined, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.BLACK);
            pass.addTexture(sceneInput, 'inputTexture');
            pass.addTexture(r.halfBloom, 'bloomTexture');
            const expandAlpha = !cfg.firstInWindow && fx.transparentBackground && fx.compositeWithAlpha ? 1 : 0;
            pass.setVec4('combineParams', new Vec4(fx.intensity, fx.glowAlphaStrength, expandAlpha, 0));
            pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(material, 5);
        }
        return r.combined;
    }
}