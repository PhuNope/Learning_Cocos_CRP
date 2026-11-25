import { gfx, renderer, rendering } from 'cc';
import { lesson11IntermediateFormat, lesson11ResourceNames, lesson11ScaledSizes } from './Lesson11PipelineConfig';

const resizeLog = new Map<number, string>();

export function registerLesson11Resources(ppl: rendering.BasicPipeline, window: renderer.RenderWindow, nativeWidth: number, nativeHeight: number) {
    const w = Math.max(1, Math.floor(nativeWidth));
    const h = Math.max(1, Math.floor(nativeHeight));
    const d = lesson11ScaledSizes(w, h);
    const format = lesson11IntermediateFormat();
    const r = lesson11ResourceNames(window);

    ppl.addRenderWindow(window.colorName, gfx.Format.RGBA8, w, h, window, window.depthStencilName);
    ppl.addRenderTarget(r.sceneColor, format, w, h);
    ppl.addDepthStencil(r.sceneDepth, gfx.Format.DEPTH_STENCIL, w, h);
    ppl.addRenderTarget(r.radiance, format, w, h);
    ppl.addRenderTarget(r.halfBright, format, d.halfWidth, d.halfHeight);
    ppl.addRenderTarget(r.quarterDown, format, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.quarterBlurH, format, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.quarterBlurV, format, d.quarterWidth, d.quarterHeight);
    ppl.addRenderTarget(r.halfBloom, format, d.halfWidth, d.halfHeight);
    ppl.addRenderTarget(r.combined, format, w, h);

    const tag = `${w}x${h}/${format}`;
    if (resizeLog.get(window.renderWindowId) !== tag) {
        resizeLog.set(window.renderWindowId, tag);
        console.log('[Lesson11:Resize]', {
            windowId: window.renderWindowId, full: `${w}x${h}`,
            half: `${d.halfWidth}x${d.halfHeight}`,
            quarter: `${d.quarterWidth}x${d.quarterHeight}`,
            sceneColor: r.sceneColor, fmt: format === gfx.Format.RGBA16F ? 'RGBA16F' : 'RGBA8',
        });
    }
}