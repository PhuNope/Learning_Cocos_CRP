import { gfx, renderer, rendering } from 'cc';
import { cameraResources } from './Lesson8PipelineConfig';

export function registerCameraResources(
    ppl: rendering.BasicPipeline,
    window: renderer.RenderWindow,
    camera: renderer.scene.Camera,
    nativeWidth: number,
    nativeHeight: number,
): void {
    const width = Math.max(1, Math.floor(nativeWidth));
    const height = Math.max(1, Math.floor(nativeHeight));

    ppl.addRenderWindow(
        window.colorName, gfx.Format.RGBA8, width, height,
        window, window.depthStencilName,
    );

    if (!camera.node) return;
    const r = cameraResources(camera);
    ppl.addRenderTarget(r.sceneColor, gfx.Format.RGBA8, width, height);
    ppl.addDepthStencil(r.sceneDepth, gfx.Format.DEPTH_STENCIL, width, height);
    ppl.addRenderTarget(r.fxA, gfx.Format.RGBA8, width, height);
    ppl.addRenderTarget(r.fxB, gfx.Format.RGBA8, width, height);

    console.log('[Lesson8:Resize]', {
        camera: camera.node.name,
        windowId: window.renderWindowId,
        size: `${width}x${height}`,
        resourceNames: r,
    });
}
