import { _decorator, Component, gfx, renderer, rendering } from 'cc';

const { ccclass } = _decorator;

type QueueMode =
    | 'SPLIT_ALL'
    | 'SINGLE_QUEUE'
    | 'OPAQUE_ONLY'
    | 'MASK_ONLY'
    | 'BLEND_ONLY'
    | 'UI_ONLY'
    | 'NO_CONTENT';

const QUEUE_MODE: QueueMode = 'SPLIT_ALL';

export class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly clearColor = new gfx.Color();
    private readonly viewPort = new gfx.Viewport();

    windowResize?(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, width: number, height: number): void {
        pipeline.addRenderWindow(window.colorName, gfx.Format.RGBA8, width, height, window, window.depthStencilName);
    }

    setup(cameras: renderer.scene.Camera[], pipeline: rendering.BasicPipeline): void {
        for (const camera of cameras) {
            if (!camera.scene || !camera.window) continue;

            this.renderCamera(camera, pipeline);
        }
    }

    private renderCamera(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline) {
        const window = camera.window;

        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);

        // Get info Clear Color
        const c = camera.clearColor;
        this.clearColor.x = c.x;
        this.clearColor.y = c.y;
        this.clearColor.z = c.z;
        this.clearColor.w = c.w;

        // Calculate viewport by pixel
        const v = camera.viewport;

        this.viewPort.left = Math.round(v.x * width);
        this.viewPort.top = Math.round(v.y * height);
        this.viewPort.width = Math.max(Math.round(v.width * width), 1);
        this.viewPort.height = Math.max(Math.round(v.height * height), 1);

        // Raster RenderPass
        const pass = pipeline.addRenderPass(width, height, 'default');
        pass.setViewport(this.viewPort);

        // Color Output
        const colorLoadOp = (camera.clearFlag & gfx.ClearFlagBit.COLOR) ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD;
        pass.addRenderTarget(window.colorName, colorLoadOp, gfx.StoreOp.STORE, this.clearColor);

        // DepthStencil
        if (camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL) {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.STORE,
                camera.clearDepth,
                camera.clearStencil,
                camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.LOAD,
                gfx.StoreOp.STORE,
            );
        }

        this.addQueues(pass, camera);
    }

    private addQueues(pass: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera) {
        const S = rendering.SceneFlags;
        const H = rendering.QueueHint;

        switch (QUEUE_MODE) {
            case 'SPLIT_ALL':
                pass.addQueue(H.OPAQUE).addScene(camera, S.OPAQUE);
                pass.addQueue(H.MASK).addScene(camera, S.MASK);
                pass.addQueue(H.BLEND).addScene(camera, S.BLEND | S.UI);
                break;

            case 'SINGLE_QUEUE':
                // Không nên dùng làm mẫu tối ưu; chỉ để quan sát.
                pass.addQueue(H.NONE)
                    .addScene(camera, S.OPAQUE | S.MASK | S.BLEND | S.UI);
                break;

            case 'OPAQUE_ONLY':
                pass.addQueue(H.OPAQUE).addScene(camera, S.OPAQUE);
                break;

            case 'MASK_ONLY':
                pass.addQueue(H.MASK).addScene(camera, S.MASK);
                break;

            case 'BLEND_ONLY':
                pass.addQueue(H.BLEND).addScene(camera, S.BLEND);
                break;

            case 'UI_ONLY':
                pass.addQueue(H.BLEND).addScene(camera, S.UI);
                break;

            case 'NO_CONTENT':
                // Pass vẫn clear color/depth, nhưng không có scene draw.
                break;
        }
    }
}

if (rendering) {
    rendering.setCustomPipeline('LearnCRP', new LearnCRPPipeline());
}

@ccclass('LearnCRPPipelineEntry')
export class LearningCRPPipelineEntry extends Component {
}