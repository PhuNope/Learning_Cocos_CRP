import { _decorator, Camera, CCBoolean, Component, Enum, Material } from 'cc';

const { ccclass, property, requireComponent, disallowMultiple } = _decorator;

/** BEFORE_BLOOM: ghi vào Shared SceneColor; AFTER_TONEMAP: ghi trực tiếp ra RenderWindow. */
export enum Lesson11CameraStage {
    BEFORE_BLOOM = 0,
    AFTER_TONEMAP = 1,
}
Enum(Lesson11CameraStage);

export enum Lesson11ToneMode {
    REINHARD = 0,
    ACES_APPROX = 1,
}
Enum(Lesson11ToneMode);

/**
 * Gắn trên Camera. Chỉ một Camera BEFORE_BLOOM của mỗi RenderWindow cần
 * isWindowController=true và điền hai Material.
 * Camera không có component được xếp vào AFTER_TONEMAP theo mặc định.
 */
@ccclass('Lesson11CameraSettings')
@requireComponent(Camera)
@disallowMultiple()
export class Lesson11CameraSettings extends Component {
    @property({ type: Enum(Lesson11CameraStage) })
    public stage = Lesson11CameraStage.BEFORE_BLOOM;

    /** Chỉ bật trên Camera điều khiển Bloom của Window, ví dụ Main Camera. */
    @property({ type: CCBoolean })
    public isWindowController = false;

    /** Dùng khi Camera này thuộc BEFORE_BLOOM và không phải Camera đầu. */
    @property({ type: CCBoolean })
    public clearDepthBeforeScene = true;

    /** Các mục dưới chỉ được đọc từ Camera isWindowController=true. */
    @property({ type: CCBoolean })
    public enableWindowPost = true;

    /** Material từ Lesson11HDRBloom.effect: 7 Shader Pass. */
    @property(Material)
    public hdrBloomMaterial: Material | null = null;

    /** Material từ Lesson11ToneMap.effect: 1 Shader Pass. */
    @property(Material)
    public toneMapMaterial: Material | null = null;

    @property({ type: CCBoolean }) public enableBloom = true;
    @property({ range: [0, 4, 0.05] }) public threshold = 0.65;
    @property({ range: [0.01, 1, 0.01] }) public softKnee = 0.15;
    @property({ range: [0, 4, 0.05] }) public intensity = 1.0;
    @property({ range: [0.25, 4, 0.25] }) public blurRadius = 1.5;
    @property({ range: [0, 1, 0.05] }) public detailWeight = 0.4;

    /** Diagnostic Gain > 1 chỉ để thấy HDR/Bloom, không thay thế lighting HDR thật. */
    @property({ range: [1, 6, 0.25] }) public diagnosticGain = 1.0;
    @property({ range: [0.1, 5, 0.1] }) public exposure = 1.0;
    @property({ type: Enum(Lesson11ToneMode) }) public toneMode = Lesson11ToneMode.ACES_APPROX;
    @property({ type: CCBoolean }) public manualSRGB = false;
}
