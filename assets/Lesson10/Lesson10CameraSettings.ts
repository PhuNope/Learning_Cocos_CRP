import { _decorator, Camera, CCBoolean, Component, Enum, Material } from 'cc';

const { ccclass, property, requireComponent, disallowMultiple } = _decorator;

export enum Lesson10ToneMode {
    REINHARD = 0,
    ACES_APPROX = 1,
}

Enum(Lesson10ToneMode);

/** Gắn lên TỪNG Camera. Với Overlay: transparent + alpha composite + không clear Color. */
@ccclass('Lesson10CameraSettings')
@requireComponent(Camera)
@disallowMultiple()
export class Lesson10CameraSettings extends Component {
    @property({ type: CCBoolean }) public enablePost = true;
    @property(Material) public postMaterial: Material | null = null;
    @property(Material) public toneMapMaterial: Material | null = null;
    @property({ type: CCBoolean }) public enableBloom = true;

    /** 1.2 hợp lý cho HDR; khi fallback RGBA8 code tự giới hạn threshold xuống 0.75. */
    @property({ range: [0, 4, 0.05] }) public threshold = 1.2;
    @property({ range: [0.01, 1, 0.01] }) public softKnee = 0.25;
    @property({ range: [0, 3, 0.05] }) public intensity = 0.85;
    @property({ range: [0.25, 4, 0.25] }) public blurRadius = 1.5;
    @property({ range: [0, 1, 0.05] }) public detailWeight = 0.4;

    /** Chỉ để thử: nhân màu Scene trước Bloom. Tắt bằng 1 khi đã có HDR lighting. */
    @property({ range: [1, 6, 0.25] }) public diagnosticGain = 2.5;
    @property({ range: [0.1, 5, 0.1] }) public exposure = 1.0;
    @property({ type: Enum(Lesson10ToneMode) }) public toneMode = Lesson10ToneMode.ACES_APPROX;

    /** Đổi cách xuất màu tuỳ workflow. Không mặc định gamma thêm để tránh double conversion. */
    @property({ type: CCBoolean }) public manualSRGB = false;
    @property({ type: CCBoolean }) public transparentBackground = false;
    @property({ type: CCBoolean }) public compositeWithAlpha = false;
    @property({ range: [0, 6, 0.1] }) public glowAlphaStrength = 2.0;
}
