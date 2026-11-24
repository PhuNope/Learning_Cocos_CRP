import { _decorator, Camera, CCBoolean, Color, Component, Material } from 'cc';
const { ccclass, property, requireComponent, disallowMultiple } = _decorator;

/** Một component cho mỗi Camera; hỗ trợ cả Camera.targetTexture. */
@ccclass('Lesson9CameraSettings')
@requireComponent(Camera)
@disallowMultiple()
export class Lesson9CameraSettings extends Component {
    @property({ type: CCBoolean }) public enableBloom = true;
    @property(Material) public bloomMaterial: Material | null = null;

    /** RGBA8 (LDR): đặt threshold khoảng 0.55-0.85 để dễ quan sát. */
    @property({ range: [0, 1, 0.02] }) public threshold = 0.68;
    @property({ range: [0.01, 0.5, 0.01] }) public softKnee = 0.10;
    @property({ range: [0, 2, 0.05] }) public intensity = 0.85;
    @property({ range: [0.25, 3, 0.25] }) public blurRadius = 1.25;
    @property({ range: [0, 1, 0.05] }) public detailWeight = 0.45;

    /** Bật cho Overlay có nền alpha = 0 để thấy World dưới Overlay. */
    @property({ type: CCBoolean }) public transparentBackground = false;
    @property({ type: CCBoolean }) public compositeWithAlpha = false;

    /** Cho phép quầng sáng mở rộng vùng alpha khi Overlay được alpha composite. */
    @property({ range: [0, 3, 0.1] }) public glowAlphaStrength = 1.8;
}
