import {
    _decorator,
    Camera,
    CCBoolean, CCFloat,
    Color,
    Component,
    Enum,
    gfx,
    Material,
    math,
    renderer,
    rendering,
    Vec4,
} from 'cc';

const { ccclass, property, requireComponent, disallowMultiple } = _decorator;

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

export enum Lesson6EffectMode {
    GRAYSCALE = 0,
    INVERT = 1,
    TINT = 2,
}

Enum(Lesson6EffectMode);

@ccclass('Lesson6CameraSettings')
@requireComponent(Camera)
@disallowMultiple()
export class Lesson6CameraSettings extends Component {
    @property(CCBoolean)
    public enablePost = true;

    @property(Material)
    public postMaterial: Material;

    @property({ type: Enum(Lesson6EffectMode) })
    public effectMode: Lesson6EffectMode = Lesson6EffectMode.GRAYSCALE;

    @property({
        type: CCFloat,
        range: [0, 1, 0.05],
    })
    public strength = 1;

    @property(Color)
    public tintColor = new Color(255, 170, 120, 255);

    @property(CCBoolean)
    public transparentBackground = false;

    @property(CCBoolean)
    public compositeWithAlpha = false;
}

type CameraResource = {
    sceneColor: string;
    sceneDepth: string;
    fxColor: string;
}

export class LearnCRPPipeline implements rendering.PipelineBuilder {
    private debugFramesLeft = 2;

    private resources(camera: renderer.scene.Camera): CameraResource {
        const windowId = camera.window.renderWindowId;
        const nodeId = camera.node!.uuid.replace(/[^a-zA-Z0-9_]/g, '_');
        const key = `L6_W${windowId}_C${nodeId}`;
        return {
            sceneColor: `${key}_SceneColor`,
            sceneDepth: `${key}_SceneDepth`,
            fxColor: `${key}_FXColor`,
        };
    }

    private sceneColorName(window: renderer.RenderWindow): string {
        return `Lesson4SceneColor_${window.renderWindowId}`;
    }

    private sceneDepthName(window: renderer.RenderWindow): string {
        return `Lesson4SceneDepth_${window.renderWindowId}`;
    }

    windowResize?(pipeline: rendering.BasicPipeline, window: renderer.RenderWindow, camera: renderer.scene.Camera, nativeWidth: number, nativeHeight: number): void {
        const width = Math.max(Math.floor(nativeWidth), 1);
        const height = Math.max(Math.floor(nativeHeight), 1);

        pipeline.addRenderWindow(window.colorName, gfx.Format.RGBA8, width, height, window, window.depthStencilName);

        if (!camera.node) return;
        const r = this.resources(camera);

        pipeline.addRenderTarget(r.sceneColor, gfx.Format.RGBA8, width, height);
        pipeline.addDepthStencil(r.sceneDepth, gfx.Format.DEPTH_STENCIL, width, height);
        pipeline.addRenderTarget(r.fxColor, gfx.Format.RGBA8, width, height);

        console.log('[Lesson6:windowResize]', {
            camera: camera.node.name, size: `${width}x${height}`,
            sceneColor: r.sceneColor, sceneDepth: r.sceneDepth, fxColor: r.fxColor,
        });
    }

    setup(cameras: renderer.scene.Camera[], pipeline: rendering.BasicPipeline): void {
        const visitedColorWindows = new Set<renderer.RenderWindow>();
        const initializedWindowDepth = new Set<renderer.RenderWindow>();

        for (const camera of cameras) {
            if (!camera.scene || !camera.window || !camera.node) continue;

            const window = camera.window;

            const isFirstInWindow = !visitedColorWindows.has(window);
            visitedColorWindows.add(window);

            const settings = camera.node.getComponent(Lesson6CameraSettings);
            const r = this.resources(camera);
            const fullViewport = this.isFullViewport(camera);
            const resourcesReady = pipeline.containsResource(r.sceneColor)
                && pipeline.containsResource(r.sceneDepth)
                && pipeline.containsResource(r.fxColor);
            const applyPost = !!settings?.enabledInHierarchy
                && settings.enablePost
                && settings.postMaterial !== null
                && fullViewport
                && resourcesReady;

            if (settings?.enablePost && settings.postMaterial && !applyPost && this.debugFramesLeft > 0) {
                console.warn('[Lesson6] PostFX bị bỏ qua: kiểm tra resource, viewport hoặc trạng thái component.', {
                    camera: camera.node.name, fullViewport, resourcesReady,
                    settingsEnabled: settings.enabledInHierarchy,
                });
            }

            if (applyPost && settings) {
                this.buildOffscreenScene(camera, pipeline, r, settings);
                this.buildFX(camera, pipeline, r, settings);
                this.buildComposite(camera, pipeline, r, settings, isFirstInWindow);
            } else {
                const depthInitialized = initializedWindowDepth.has(window);
                this.buildDirectScene(camera, pipeline, isFirstInWindow, depthInitialized);
                initializedWindowDepth.add(window);
            }

            if (this.debugFramesLeft > 0) {
                console.log(`Camera: ${camera.name}, Window: ${camera.window.colorName}, Depth: ${camera.window.depthStencilName}, ID: ${camera.window.renderWindowId}`);

                console.log('[Lesson6:setup]', {
                    camera: camera.node.name, windowId: window.renderWindowId,
                    isFirstInWindow, applyPost,
                    route: applyPost ? 'SceneColor -> FXColor -> Window' : 'Window direct',
                });
            }
        }
        if (this.debugFramesLeft > 0) this.debugFramesLeft--;
    }

    private buildOffscreenScene(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline, r: CameraResource, settings: Lesson6CameraSettings) {
        const width = Math.max(1, Math.floor(camera.window.width));
        const height = Math.max(1, Math.floor(camera.window.height));
        const clear = this.cameraClearColor(camera);
        if (settings.transparentBackground) {
            clear.x = 0;
            clear.y = 0;
            clear.z = 0;
            clear.w = 0;
        }

        const pass = pipeline.addRenderPass(width, height, 'default');
        pass.setViewport(this.fullViewport(width, height));

        pass.addRenderTarget(r.sceneColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, clear);
        pass.addDepthStencil(r.sceneDepth, gfx.LoadOp.CLEAR, gfx.StoreOp.DISCARD, camera.clearDepth, camera.clearStencil, gfx.ClearFlagBit.DEPTH_STENCIL);

        this.addSceneQueue(pass, camera);
    }

    private buildFX(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline, r: CameraResource, settings: Lesson6CameraSettings) {
        const width = Math.max(1, Math.floor(camera.window.width));
        const height = Math.max(1, Math.floor(camera.window.height));
        const tint = settings.tintColor;
        const pass = pipeline.addRenderPass(width, height, 'lesson6-fx');

        pass.setViewport(this.fullViewport(width, height));
        pass.addRenderTarget(r.fxColor, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, new gfx.Color(0, 0, 0, 0));
        pass.addTexture(r.sceneColor, 'inputTexture');
        pass.setVec4('fxParams', new Vec4(settings.effectMode, math.clamp01(settings.strength), 0, 0));
        pass.setVec4('fxTint', new Vec4(tint.r / 255, tint.g / 255, tint.b / 255, tint.a / 255));
        pass.addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(settings.postMaterial!, 0);
    }

    private buildComposite(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline, r: CameraResource, settings: Lesson6CameraSettings, isFirstWindow: boolean) {
        const window = camera.window;
        const width = Math.max(1, Math.floor(window.width));
        const height = Math.max(1, Math.floor(window.height));
        const clearWindow = isFirstWindow || !!(camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const passIndex = !isFirstWindow && settings.compositeWithAlpha ? 2 : 1;
        const passName = passIndex === 2 ? 'lesson6-compose-alpha' : 'lesson6-compose-opaque';

        const pass = pipeline.addRenderPass(width, height, passName);
        pass.setViewport(this.fullViewport(width, height));
        pass.addRenderTarget(
            window.colorName,
            clearWindow ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            this.cameraClearColor(camera),
        );
        pass.addTexture(r.fxColor, 'inputTexture');
        pass.addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(settings.postMaterial!, passIndex);
    }

    private buildDirectScene(camera: renderer.scene.Camera, pipeline: rendering.BasicPipeline, isFirstInWindow: boolean, windowDepthInitialized: boolean) {
        const window = camera.window;
        const width = Math.max(1, Math.floor(window.width));
        const height = Math.max(1, Math.floor(window.height));
        const clearColor = isFirstInWindow || !!(camera.clearFlag & gfx.ClearFlagBit.COLOR);
        const clearDepth = !windowDepthInitialized || !!(camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL);

        const pass = pipeline.addRenderPass(width, height, 'default');
        pass.setViewport(this.cameraViewport(camera, width, height));
        pass.addRenderTarget(
            window.colorName,
            clearColor ? gfx.LoadOp.CLEAR : gfx.LoadOp.LOAD,
            gfx.StoreOp.STORE,
            this.cameraClearColor(camera),
        );
        if (clearDepth) {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.STORE,
                camera.clearDepth,
                camera.clearStencil,
                gfx.ClearFlagBit.DEPTH_STENCIL,
            );
        } else {
            pass.addDepthStencil(window.depthStencilName, gfx.LoadOp.LOAD, gfx.StoreOp.STORE);
        }
        this.addSceneQueue(pass, camera);
    }

    private addSceneQueue(pass: rendering.BasicRenderPassBuilder, camera: renderer.scene.Camera) {
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

    private fullViewport(width: number, height: number): gfx.Viewport {
        const viewport = new gfx.Viewport();
        viewport.left = 0;
        viewport.top = 0;
        viewport.width = width;
        viewport.height = height;
        return viewport;
    }

    private cameraClearColor(camera: renderer.scene.Camera): gfx.Color {
        const c = camera.clearColor;
        return new gfx.Color(c.x, c.y, c.z, c.w);
    }

    private isFullViewport(camera: renderer.scene.Camera): boolean {
        const v = camera.viewport;
        const eps = 0.0001;
        return Math.abs(v.x) < eps && Math.abs(v.y) < eps
            && Math.abs(v.width - 1) < eps && Math.abs(v.height - 1) < eps;
    }

    private cameraViewport(camera: renderer.scene.Camera, width: number, height: number): gfx.Viewport {
        const v = camera.viewport;
        const result = new gfx.Viewport();
        result.left = Math.round(v.x * width);
        result.top = Math.round(v.y * height);
        result.width = Math.max(1, Math.round(v.width * width));
        result.height = Math.max(1, Math.round(v.height * height));
        return result;
    }
}

const BUILDER = new LearnCRPPipeline();
if (rendering) {
    rendering.setCustomPipeline('LearnCRP', BUILDER);
}