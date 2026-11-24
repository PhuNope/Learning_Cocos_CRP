import { _decorator, Camera, CCBoolean, Color, Component, Enum, Material } from 'cc';
import { Lesson8EffectMode } from './Lesson8PipelineTypes';

const { ccclass, property, requireComponent, disallowMultiple } = _decorator;
Enum(Lesson8EffectMode);

@ccclass('Lesson8CameraSettings')
@requireComponent(Camera)
@disallowMultiple()
export class Lesson8CameraSettings extends Component {
    @property({ type: CCBoolean })
    public enablePost = true;

    @property(Material)
    public postMaterial: Material | null = null;

    @property({ type: Enum(Lesson8EffectMode) })
    public effectMode: Lesson8EffectMode = Lesson8EffectMode.GRAYSCALE;

    @property({ range: [0, 1, 0.05] })
    public strength = 1;

    @property({ type: CCBoolean })
    public enableSecondFX = false;

    @property({ type: Enum(Lesson8EffectMode) })
    public secondEffectMode: Lesson8EffectMode = Lesson8EffectMode.TINT;

    @property({ range: [0, 1, 0.05] })
    public secondStrength = 0.6;

    @property(Color)
    public tintColor = new Color(255, 170, 120, 255);

    @property({ type: CCBoolean })
    public transparentBackground = false;

    @property({ type: CCBoolean })
    public compositeWithAlpha = false;
}
