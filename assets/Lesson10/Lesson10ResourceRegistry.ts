import { gfx, renderer, rendering } from 'cc';
import { getIntermediateFormat, resourceNames, scaledSizes } from './Lesson10PipelineConfig';

/** Đăng ký resource khi windowResize; không đăng ký lại trong setup() mỗi frame. */
export function registerLesson10Resources(
    ppl: rendering.BasicPipeline,
    window: renderer.RenderWindow,
    camera: renderer.scene.Camera,
    nativeWidth: number,
    nativeHeight: number,
): void {
    const w = Math.max(1, Math.floor(nativeWidth));
    const h = Math.max(1, Math.floor(nativeHeight));
    const d = scaledSizes(w, h);
    // Format của window thuộc render surface; KHÔNG chuyển window.colorName sang RGBA16F.
    ppl.addRenderWindow(window.colorName, gfx.Format.RGBA8, w, h, window, window.depthStencilName);
    if (!camera.node) return;
    const r = resourceNames(camera);
    const format = getIntermediateFormat();
    ppl.addRenderTarget(r.sceneColor, format, w, h);
    ppl.addDepthStencil(r.sceneDepth, gfx.Format.DEPTH_STENCIL, w, h);
    ppl.addRenderTarget(r.radiance, format, w, h);
    ppl.addRenderTarget(r.halfBright, format, d.halfWidth, d.halfHeight);
    ppl.addRenderTarget(r.quarterDown, format, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.quarterBlurH, format, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.quarterBlurV, format, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.halfBloom, format, d.halfWidth, d.halfHeight);
    ppl.addRenderTarget(r.combined, format, w, h);
    console.log('[Lesson10:Resize]', {
        camera: camera.node.name, windowId: window.renderWindowId,
        full: `${w}x${h}`, half: `${d.halfWidth}x${d.halfHeight}`,
        quarter: `${d.quarterWidth}x${d.quarterHeight}`,
        format: format === gfx.Format.RGBA16F ? 'RGBA16F' : 'RGBA8',
    });
}
