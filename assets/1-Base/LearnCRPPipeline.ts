import { _decorator, Component, gfx, Material, math, renderer, rendering, Vec4 } from 'cc';

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
    private readonly grayscaleParams = new Vec4(1, 0, 0, 0);

    private postMaterial: Material = null;
    private warnedMultipleCameras = false;

    public setOptions(material: Material, strength: number) {
        this.postMaterial = material;
        this.grayscaleParams.x = math.clamp01(strength);
    }

    private sceneColorName(window: renderer.RenderWindow): string {
        return `Lesson4SceneColor_${window.renderWindowId}`;
    }

    private sceneDepthName(window: renderer.RenderWindow): string {
        return `Lesson4SceneDepth_${window.renderWindowId}`;
    }

    windowResize?(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, width: number, height: number): void {
        pipeline.addRenderWindow(window.colorName, gfx.Format.RGBA8, width, height, window, window.depthStencilName);

        pipeline.addRenderTarget(this.sceneColorName(window), gfx.Format.RGBA8, width, height);

        pipeline.addDepthStencil(this.sceneDepthName(window), gfx.Format.DEPTH_STENCIL, width, height);
    }

    setup(cameras: renderer.scene.Camera[], pipeline: rendering.BasicPipeline): void {
        const visitedWindows = new Set<number>();

        for (let i = 0; i < cameras.length; i++) {
            const camera = cameras[i];
            if (!camera.scene || !camera.window) continue;

            const id = camera.window.renderWindowId;
            if (visitedWindows.has(id)) {
                if (this.warnedMultipleCameras) {
                    this.warnedMultipleCameras = true;
                    console.warn('[Lesson4] Detect multiple Cameras render with RenderWindow. Only render first Camera of each window. Let try with 1 Camera.');
                }
                continue;
            }
            visitedWindows.add(id);
            this.buildCamera(camera, pipeline);
        }
    }

    private buildCamera(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline) {
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

        const hasPost = this.postMaterial !== null;
        // const hasPost = false;
        const sceneOutput = hasPost ? this.sceneColorName(window) : window.colorName;

        // render 3D and UI
        const scenePass = pipeline.addRenderPass(width, height, 'default');
        scenePass.setViewport(this.viewPort);
        scenePass.addRenderTarget(sceneOutput, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.clearColor);
        scenePass.addDepthStencil(
            hasPost ? this.sceneDepthName(window) : window.depthStencilName,
            gfx.LoadOp.CLEAR,
            gfx.StoreOp.DISCARD,
            camera.clearDepth,
            camera.clearStencil,
            gfx.ClearFlagBit.DEPTH_STENCIL,
        );

        this.addQueues(scenePass, camera);

        if (!hasPost) return;

        // Sample SceneColor and draw fullscreen quad to RenderWindow
        const postPass = pipeline.addRenderPass(width, height, 'lesson4-grayscale');
        postPass.setViewport(this.viewPort);
        postPass.addRenderTarget(window.colorName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, this.clearColor);

        postPass.addTexture(this.sceneColorName(window), 'inputTexture');
        postPass.setVec4('lesson4Params', this.grayscaleParams);
        postPass.addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(this.postMaterial, 0);
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

const BUILDER = new LearnCRPPipeline();
if (rendering) {
    rendering.setCustomPipeline('LearnCRP', BUILDER);
}

@ccclass('LearnCRPPipelineEntry')
export class LearningCRPPipelineEntry extends Component {
    @_decorator.property(Material)
    public postMaterial: Material = null;

    @_decorator.property({ range: [0, 1, 0.05] })
    public grayscaleStrength = 1;

    protected onEnable() {
        BUILDER.setOptions(this.postMaterial, this.grayscaleStrength);
    }

    protected update(dt: number) {
        BUILDER.setOptions(this.postMaterial, this.grayscaleStrength);
    }

    protected onDisable() {
        BUILDER.setOptions(null, 1);
    }
}