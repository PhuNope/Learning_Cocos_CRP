import { _decorator, Color, Component, gfx, Material, math, renderer, rendering, Vec4 } from 'cc';

const { ccclass, property } = _decorator;

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

type EffectKind = 0 | 1 | 2;
type EffectStage = { kind: EffectKind; amount: number }

type Lesson5Settings = {
    material: Material;
    grayscale: boolean;
    grayscaleAmount: number;
    invert: boolean;
    invertAmount: number;
    tint: boolean;
    tintAmount: number;
    tintColor: Color;
    halfResolution: boolean
}

export class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly settings: Lesson5Settings = {
        material: null,
        grayscale: true,
        grayscaleAmount: 1,
        invert: false,
        invertAmount: 1,
        tint: false,
        tintAmount: 0.5,
        tintColor: new Color(255, 170, 120, 255),
        halfResolution: false,
    };

    private debugFramesLeft = 2;

    private readonly clearColor = new gfx.Color();
    private readonly viewPort = new gfx.Viewport();
    private readonly grayscaleParams = new Vec4(1, 0, 0, 0);

    private postMaterial: Material = null;
    private warnedMultipleCameras = false;

    public setOptions(options: Lesson5Settings) {
        const s = this.settings;
        s.material = options.material;
        s.grayscale = options.grayscale;
        s.grayscaleAmount = math.clamp01(options.grayscaleAmount);
        s.invert = options.invert;
        s.invertAmount = math.clamp01(options.invertAmount);
        s.tint = options.tint;
        s.tintAmount = math.clamp01(options.tintAmount);
        s.tintColor.set(options.tintColor);
        s.halfResolution = options.halfResolution;
    }

    public clearOptions() {
        this.settings.material = null;
    }

    private sceneColorName(window: renderer.RenderWindow): string {
        return `Lesson4SceneColor_${window.renderWindowId}`;
    }

    private sceneDepthName(window: renderer.RenderWindow): string {
        return `Lesson4SceneDepth_${window.renderWindowId}`;
    }

    private pingName(window: renderer.RenderWindow, index: number, halfResolution: boolean): string {
        const slot = index % 2 === 0 ? 'A' : 'B';
        const scale = halfResolution ? 'Half' : 'Full';

        return `Lesson5Ping${slot}${scale}_${window.renderWindowId}`;
    }

    windowResize?(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, nativeWidth: number, nativeHeight: number): void {
        const width = Math.max(Math.floor(nativeWidth), 1);
        const height = Math.max(Math.floor(nativeHeight), 1);
        const halfWidth = Math.max(Math.floor(width / 2), 1);
        const halfHeight = Math.max(Math.floor(height / 2), 1);

        pipeline.addRenderWindow(window.colorName, gfx.Format.RGBA8, width, height, window, window.depthStencilName);

        pipeline.addRenderTarget(this.sceneColorName(window), gfx.Format.RGBA8, width, height);

        pipeline.addDepthStencil(this.sceneDepthName(window), gfx.Format.DEPTH_STENCIL, width, height);

        for (let i = 0; i < 2; i++) {
            pipeline.addRenderTarget(
                this.pingName(window, i, false),
                gfx.Format.RGBA8,
                width,
                height,
            );
            pipeline.addRenderTarget(
                this.pingName(window, i, true),
                gfx.Format.RGBA8,
                halfWidth,
                halfHeight,
            );
        }
    }

    setup(cameras: renderer.scene.Camera[], pipeline: rendering.BasicPipeline): void {
        const visitedWindows = new Set<renderer.RenderWindow>();
        const stages = this.makeStages();
        const hasPost = this.settings.material !== null && stages.length > 0;

        for (const camera of cameras) {
            if (!camera.scene || !camera.window) continue;

            const isFirstInWindow = !visitedWindows.has(camera.window);
            visitedWindows.add(camera.window);

            const applyPost = isFirstInWindow && hasPost;
            this.buildCamera(camera, pipeline, applyPost, isFirstInWindow, stages);
        }
        if (this.debugFramesLeft > 0) this.debugFramesLeft--;
    }

    private makeStages(): EffectStage[] {
        const s = this.settings;
        const result: EffectStage[] = [];
        if (s.grayscale && s.grayscaleAmount > 0) {
            result.push({ kind: 0, amount: s.grayscaleAmount });
        }
        if (s.invert && s.invertAmount > 0) {
            result.push({ kind: 1, amount: s.invertAmount });
        }
        if (s.tint && s.tintAmount > 0) {
            result.push({ kind: 2, amount: s.tintAmount });
        }
        return result;
    }

    private buildCamera(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline, applyPost: boolean, isFirstInWindow: boolean, stages: EffectStage[]) {
        const window = camera.window;
        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);
        const viewport = this.cameraViewport(camera, width, height);
        const color = new gfx.Color(
            camera.clearColor.x,
            camera.clearColor.y,
            camera.clearColor.z,
            camera.clearColor.w,
        );

        const sceneTarget = applyPost ? this.sceneColorName(window) : window.colorName;
        const depthTarget = applyPost ? this.sceneDepthName(window) : window.depthStencilName;

        // render 3D and UI
        const scenePass = pipeline.addRenderPass(width, height, 'default');
        scenePass.setViewport(viewport);

        const sceneColorLoad = isFirstInWindow || applyPost ||
        !!(camera.clearFlag & gfx.ClearFlagBit.COLOR)
            ? gfx.LoadOp.CLEAR
            : gfx.LoadOp.LOAD;

        scenePass.addRenderTarget(sceneTarget, sceneColorLoad, gfx.StoreOp.STORE, color);

        scenePass.addDepthStencil(
            depthTarget,
            gfx.LoadOp.CLEAR,
            gfx.StoreOp.DISCARD,
            camera.clearDepth,
            camera.clearStencil,
            gfx.ClearFlagBit.DEPTH_STENCIL,
        );

        this.addQueues(scenePass, camera);

        if (this.debugFramesLeft > 0) {
            console.log('[Lesson5:Camera]', {
                camera: camera.node?.name,
                windowId: window.renderWindowId,
                isFirstInWindow,
                applyPost,
                sceneTarget,
                stages: stages.map(s => s.kind),
                colorLoad: sceneColorLoad === gfx.LoadOp.CLEAR ? 'CLEAR' : 'LOAD',
            });
        }

        if (!applyPost || !this.settings.material) return;

        const half = this.settings.halfResolution;
        const postWidth = half ? Math.max(Math.floor(width / 2), 1) : width;
        const postHeight = half ? Math.max(Math.floor(height / 2), 1) : height;
        const tint = this.settings.tintColor;
        const tintVec = new Vec4(
            tint.r / 255,
            tint.g / 255,
            tint.b / 255,
            tint.a / 255,
        );
        const black = new gfx.Color(0, 0, 0, 1);
        let inputName = sceneTarget;

        for (let i = 0; i < stages.length; i++) {
            const last = i === stages.length - 1;
            const outputName = last ? window.colorName : this.pingName(window, i, half);
            const targetWidth = last ? width : postWidth;
            const targetHeight = last ? height : postHeight;

            const postPass = pipeline.addRenderPass(targetWidth, targetHeight, 'lesson5-colorfx');
            postPass.setViewport(this.fullViewport(targetWidth, targetHeight));
            postPass.addRenderTarget(outputName, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, black);
            postPass.addTexture(inputName, 'inputTexture');
            postPass.setVec4('fxParams', new Vec4(stages[i].kind, stages[i].amount, 0, 0));
            postPass.setVec4('fxTint', tintVec);
            postPass.addQueue(rendering.QueueHint.OPAQUE)
                .addFullscreenQuad(this.settings.material, 0);

            if (this.debugFramesLeft > 0) {
                console.log('[Lesson5:PostPass]', {
                    index: i,
                    mode: stages[i].kind,
                    inputName,
                    outputName,
                    size: `${targetWidth}x${targetHeight}`,
                });
            }

            inputName = outputName;
        }
    }

    private cameraViewport(camera: renderer.scene.Camera, width: number, height: number): gfx.Viewport {
        const v = camera.viewport;
        const result = new gfx.Viewport();
        result.left = Math.round(v.x * width);
        result.top = Math.round(v.y * height);
        result.width = Math.max(Math.round(v.width * width), 1);
        result.height = Math.max(Math.round(v.height * height), 1);
        return result;
    }

    private fullViewport(width: number, height: number): gfx.Viewport {
        const v = new gfx.Viewport();
        v.left = 0;
        v.top = 0;
        v.width = width;
        v.height = height;
        return v;
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
    @property(Material)
    public postMaterial: Material | null = null;

    @property
    public enableGrayscale = true;

    @property({ range: [0, 1, 0.05] })
    public grayscaleStrength = 1;

    @property
    public enableInvert = false;

    @property({ range: [0, 1, 0.05] })
    public invertStrength = 1;

    @property
    public enableTint = false;

    @property({ range: [0, 1, 0.05] })
    public tintStrength = 0.5;

    @property(Color)
    public tintColor = new Color(255, 170, 120, 255);

    @property
    public halfResolutionIntermediates = false;

    protected onEnable(): void {
        this.sync();
    }

    protected update(_dt: number): void {
        this.sync();
    }

    protected onDisable(): void {
        BUILDER.clearOptions();
    }

    private sync(): void {
        BUILDER.setOptions({
            material: this.postMaterial,
            grayscale: this.enableGrayscale,
            grayscaleAmount: this.grayscaleStrength,
            invert: this.enableInvert,
            invertAmount: this.invertStrength,
            tint: this.enableTint,
            tintAmount: this.tintStrength,
            tintColor: this.tintColor,
            halfResolution: this.halfResolutionIntermediates,
        });
    }
}