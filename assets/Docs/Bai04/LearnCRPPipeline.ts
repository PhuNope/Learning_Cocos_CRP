/**
 * Bài 4 — Custom Render Pipeline, Cocos Creator 3.8.8.
 * Mục đích: 1 Camera -> SceneColor -> fullscreen Grayscale -> RenderWindow.
 *
 * LƯU Ý:
 * - Giữ duy nhất MỘT file đăng ký pipeline tên LearnCRP trong project.
 * - Học 1 Camera trước. Nhiều Camera trên cùng RenderWindow được phát cảnh báo.
 * - Code minh họa CRP tối giản, không thay thế Builtin (không shadow/HDR/lighting đầy đủ).
 */
import {
    _decorator,
    Component,
    gfx,
    Material,
    renderer,
    rendering,
    Vec4,
} from 'cc';

const { ccclass, property } = _decorator;

class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly clearColor = new gfx.Color();
    private readonly viewport = new gfx.Viewport();
    private readonly grayscaleParams = new Vec4(1, 0, 0, 0);

    private postMaterial: Material | null = null;
    private warnedMultipleCameras = false;

    public setOptions(material: Material | null, strength: number): void {
        this.postMaterial = material;
        this.grayscaleParams.x = Math.min(1, Math.max(0, strength));
    }

    private sceneColorName(window: renderer.RenderWindow): string {
        return `Lesson4SceneColor_${window.renderWindowId}`;
    }

    private sceneDepthName(window: renderer.RenderWindow): string {
        return `Lesson4SceneDepth_${window.renderWindowId}`;
    }

    public windowResize(
        ppl: rendering.BasicPipeline,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number,
    ): void {
        // Cần đăng ký đầy đủ resource trong windowResize trước khi dùng ở setup().
        ppl.addRenderWindow(
            window.colorName,
            gfx.Format.RGBA8,
            nativeWidth,
            nativeHeight,
            window,
            window.depthStencilName,
        );

        // Texture màu trung gian: vừa là attachment của ScenePass,
        // vừa là texture được sample trong PostPass.
        ppl.addRenderTarget(
            this.sceneColorName(window),
            gfx.Format.RGBA8,
            nativeWidth,
            nativeHeight,
        );

        // Depth dùng trong ScenePass, không cần sample ở bài này.
        ppl.addDepthStencil(
            this.sceneDepthName(window),
            gfx.Format.DEPTH_STENCIL,
            nativeWidth,
            nativeHeight,
        );
    }

    public setup(
        cameras: renderer.scene.Camera[],
        ppl: rendering.BasicPipeline,
    ): void {
        const visitedWindows = new Set<number>();

        for (const camera of cameras) {
            if (!camera.scene || !camera.window) continue;

            // Bài 4 chủ ý chỉ xử lý 1 camera / RenderWindow.
            // Tránh ngộ nhận code này đã xử lý xếp chồng nhiều camera.
            const id = camera.window.renderWindowId;
            if (visitedWindows.has(id)) {
                if (!this.warnedMultipleCameras) {
                    this.warnedMultipleCameras = true;
                    console.warn(
                        '[Lesson4] Phát hiện nhiều Camera cùng RenderWindow. ' +
                        'Bài 4 chỉ render Camera đầu tiên của mỗi window. ' +
                        'Hãy thử với đúng 1 Camera trước.',
                    );
                }
                continue;
            }
            visitedWindows.add(id);
            this.buildCamera(camera, ppl);
        }
    }

    private buildCamera(
        camera: renderer.scene.Camera,
        ppl: rendering.BasicPipeline,
    ): void {
        const window = camera.window;
        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);

        const vp = camera.viewport;
        this.viewport.left = Math.round(vp.x * width);
        this.viewport.top = Math.round(vp.y * height);
        this.viewport.width = Math.max(Math.round(vp.width * width), 1);
        this.viewport.height = Math.max(Math.round(vp.height * height), 1);

        const c = camera.clearColor;
        this.clearColor.x = c.x;
        this.clearColor.y = c.y;
        this.clearColor.z = c.z;
        this.clearColor.w = c.w;

        // Chế độ dự phòng: chưa gắn material -> render thẳng lên màn hình.
        const hasPost = this.postMaterial !== null;
        const sceneOutput = hasPost
            ? this.sceneColorName(window)
            : window.colorName;

        // ===== PASS 1: render thế giới 3D (và UI thử nghiệm) =====
        const scenePass = ppl.addRenderPass(width, height, 'default');
        scenePass.setViewport(this.viewport);
        scenePass.addRenderTarget(
            sceneOutput,
            gfx.LoadOp.CLEAR,
            gfx.StoreOp.STORE,
            this.clearColor,
        );
        scenePass.addDepthStencil(
            hasPost ? this.sceneDepthName(window) : window.depthStencilName,
            gfx.LoadOp.CLEAR,
            gfx.StoreOp.DISCARD,
            camera.clearDepth,
            camera.clearStencil,
            gfx.ClearFlagBit.DEPTH_STENCIL,
        );

        scenePass.addQueue(rendering.QueueHint.OPAQUE)
            .addScene(camera, rendering.SceneFlags.OPAQUE);
        scenePass.addQueue(rendering.QueueHint.MASK)
            .addScene(camera, rendering.SceneFlags.MASK);
        scenePass.addQueue(rendering.QueueHint.BLEND)
            .addScene(
                camera,
                rendering.SceneFlags.BLEND | rendering.SceneFlags.UI,
            );

        if (!this.postMaterial) return;

        // ===== PASS 2: sample SceneColor và vẽ fullscreen ra RenderWindow =====
        // 'lesson4-grayscale' phải KHỚP với "pass:" trong Grayscale.effect.
        const postPass = ppl.addRenderPass(width, height, 'lesson4-grayscale');
        postPass.setViewport(this.viewport);
        postPass.addRenderTarget(
            window.colorName,
            gfx.LoadOp.CLEAR,
            gfx.StoreOp.STORE,
            this.clearColor,
        );

        // 'inputTexture' phải KHỚP với tên sampler trong Grayscale.effect.
        postPass.addTexture(this.sceneColorName(window), 'inputTexture');
        postPass.setVec4('lesson4Params', this.grayscaleParams);
        postPass.addQueue(rendering.QueueHint.OPAQUE)
            .addFullscreenQuad(this.postMaterial, 0);
    }
}

const BUILDER = new LearnCRPPipeline();
if (rendering) {
    // Tên phải trùng trong Project Settings > Graphics Settings > Render Pipeline (New).
    rendering.setCustomPipeline('LearnCRP', BUILDER);
}

/**
 * Gắn component này vào Node CRPEntry, kéo Material được tạo từ Grayscale.effect.
 * Tránh đặt nhiều component này cùng lúc trong Scene.
 */
@ccclass('LearnCRPLesson4Entry')
export class LearnCRPLesson4Entry extends Component {
    @property({ type: Material })
    public postMaterial: Material | null = null;

    @property({ range: [0, 1, 0.05] })
    public grayscaleStrength = 1;

    protected onEnable(): void {
        BUILDER.setOptions(this.postMaterial, this.grayscaleStrength);
    }

    protected update(): void {
        // Hỗ trợ điều chỉnh Strength trong Inspector khi Preview đang chạy.
        BUILDER.setOptions(this.postMaterial, this.grayscaleStrength);
    }

    protected onDisable(): void {
        BUILDER.setOptions(null, 1);
    }
}
