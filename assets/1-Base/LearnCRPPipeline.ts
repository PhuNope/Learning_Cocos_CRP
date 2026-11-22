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

type ClearExperiment =
    | 'CAMERA_FLAGS'
    | 'FORCE_LATER_COLOR_CLEAR'
    | 'FORCE_LATER_COLOR_LOAD'
    | 'FORCE_LATER_DEPTH_LOAD'
    | 'FORCE_LATER_DEPTH_CLEAR';

const EXPERIMENT: ClearExperiment = 'CAMERA_FLAGS';

export class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly clearColor = new gfx.Color();
    private readonly viewPort = new gfx.Viewport();
    private debugFrameRemaining = 2;

    windowResize?(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, width: number, height: number): void {
        pipeline.addRenderWindow(window.colorName, gfx.Format.RGBA8, width, height, window, window.depthStencilName);
    }

    setup(cameras: renderer.scene.Camera[], pipeline: rendering.BasicPipeline): void {
        const windowCameraCount = new Map<renderer.RenderWindow, number>();

        if (this.debugFrameRemaining > 0) {
            console.log('[LearnCRP:Lesion 3] API:', pipeline.device.gfxAPI);
            console.log('[LearnCRP:Lesion 3] experiment:', EXPERIMENT);
        }

        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (!camera.scene || !camera.window) continue;

            const window = camera.window;
            const withinWindowIndex = windowCameraCount.get(window) ?? 0;
            windowCameraCount.set(window, withinWindowIndex + 1);

            if (this.debugFrameRemaining > 0) {
                console.log('LearnCRP:Lesion 3] camera', {
                    globalIndex: i,
                    withinWindowIndex,
                    name: camera.node?.name ?? '(no node)',
                    priority: camera.priority,
                    clearFlag: camera.clearFlag,
                    viewport: {
                        x: camera.viewport.x,
                        y: camera.viewport.y,
                        width: camera.viewport.width,
                        height: camera.viewport.height,
                    },
                    colorName: camera.window.colorName,
                    depthName: camera.window.depthStencilName,
                });
            }

            this.buildCameraPass(camera, pipeline, withinWindowIndex);
        }

        if (this.debugFrameRemaining > 0) {
            this.debugFrameRemaining--;
        }
    }

    private buildCameraPass(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline, withinWindowIndex: number) {
        const window = camera.window;
        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);

        const v = camera.viewport;
        this.viewPort.left = Math.round(v.x * width);
        this.viewPort.top = Math.round(v.y * height);
        this.viewPort.width = Math.max(Math.round(v.width * width), 1);
        this.viewPort.height = Math.max(Math.round(v.height * height), 1);

        const c = camera.clearColor;
        this.clearColor.x = c.x;
        this.clearColor.y = c.y;
        this.clearColor.z = c.z;
        this.clearColor.w = c.w;

        const pass = pipeline.addRenderPass(width, height, 'default');
        pass.setViewport(this.viewPort);

        let colorLoad = (camera.clearFlag & gfx.ClearFlagBit.COLOR) ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD;
        let depthClearBits = camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL;
        let depthLoad = depthClearBits ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD;

        if (withinWindowIndex > 0) {
            switch (EXPERIMENT) {
                case 'FORCE_LATER_COLOR_CLEAR':
                    colorLoad = gfx.LoadOp.CLEAR;
                    break;
                case 'FORCE_LATER_COLOR_LOAD':
                    colorLoad = gfx.LoadOp.LOAD;
                    break;
                case 'FORCE_LATER_DEPTH_LOAD':
                    depthLoad = gfx.LoadOp.LOAD;
                    depthClearBits = 0;
                    break;
                case 'FORCE_LATER_DEPTH_CLEAR':
                    depthLoad = gfx.LoadOp.CLEAR;
                    depthClearBits = gfx.ClearFlagBit.DEPTH_STENCIL;
                    break;
            }
        }

        pass.addRenderTarget(window.colorName, colorLoad, gfx.StoreOp.STORE, this.clearColor);

        if (depthLoad === gfx.LoadOp.CLEAR) {
            pass.addDepthStencil(window.depthStencilName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, camera.clearDepth, camera.clearStencil);
        } else {
            pass.addDepthStencil(window.depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
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