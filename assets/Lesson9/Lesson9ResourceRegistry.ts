import { gfx, renderer, rendering } from 'cc';
import { resourceNames, sizes } from './Lesson9PipelineConfig';

/** Gọi trong PipelineBuilder.windowResize(), KHÔNG gọi mỗi frame trong setup(). */
export function registerCameraResources(
    ppl: rendering.BasicPipeline,
    window: renderer.RenderWindow,
    camera: renderer.scene.Camera,
    nativeWidth: number,
    nativeHeight: number,
): void {
    const w = Math.max(1, Math.floor(nativeWidth));
    const h = Math.max(1, Math.floor(nativeHeight));
    const d = sizes(w, h);
    ppl.addRenderWindow(window.colorName, gfx.Format.RGBA8, w, h, window, window.depthStencilName);
    if (!camera.node) return;
    const r = resourceNames(camera);
    ppl.addRenderTarget(r.sceneColor, gfx.Format.RGBA8, w, h);
    ppl.addDepthStencil(r.sceneDepth, gfx.Format.DEPTH_STENCIL, w, h);
    ppl.addRenderTarget(r.halfBright, gfx.Format.RGBA8, d.halfWidth, d.halfHeight);
    ppl.addRenderTarget(r.quarterDown, gfx.Format.RGBA8, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.quarterBlurH, gfx.Format.RGBA8, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.quarterBlurV, gfx.Format.RGBA8, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.halfBloom, gfx.Format.RGBA8, d.halfWidth, d.halfHeight);
    ppl.addRenderTarget(r.combined, gfx.Format.RGBA8, w, h);
    console.log('[Lesson9:Resize]', {
        camera: camera.node.name, windowId: window.renderWindowId,
        full: `${w}x${h}`,
        half: `${d.halfWidth}x${d.halfHeight}`,
        quarter: `${d.quarterWidth}x${d.quarterHeight}`,
        sceneColor: r.sceneColor,
    });
}
