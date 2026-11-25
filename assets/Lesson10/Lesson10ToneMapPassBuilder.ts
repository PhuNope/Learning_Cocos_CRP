import { gfx, rendering, Vec4 } from 'cc';
import { cameraClearColor, fullViewport } from 'db://assets/Lesson10/Lesson10PipelineConfig';
import { Lesson10CameraConfig } from 'db://assets/Lesson10/Lesson10PipelineTypes';

export class Lesson10ToneMapPassBuilder {
    public static build(cfg: Lesson10CameraConfig, ppl: rendering.BasicPipeline, sceneInput: string, combinedInput: string) {
        const fx = cfg.fx!;
        const blendOverlay = !cfg.firstInWindow && fx.compositeWithAlpha;
        const index = blendOverlay ? 1 : 0;
        const name = blendOverlay ? 'lesson10-tonemap-alpha' : 'lesson10-tonemap-opaque';
        const clear = cfg.firstInWindow || !!(cfg.camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const pass = ppl.addRenderPass(cfg.width, cfg.height, name);
        pass.setViewport(fullViewport(cfg.width, cfg.height));

        // LDR surface of RenderWindow, do not use RGBA16F for window.colorName
        pass.addRenderTarget(
            cfg.window.colorName,
            clear ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            cameraClearColor(cfg.camera),
        );
        pass.addTexture(combinedInput, 'inputTexture');
        pass.addTexture(sceneInput, 'sceneTexture');
        pass.setVec4('toneParams', new Vec4(fx.exposure, fx.toneMode, fx.manualSRGB ? 1 : 0, fx.glowAlphaStrength));
        pass.addQueue(rendering.QueueHint.OPAQUE).addFullscreenQuad(fx.toneMapMaterial, index);
    }
}
