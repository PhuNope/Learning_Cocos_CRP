import { _decorator, Camera, CCBoolean, Color, Component, Enum, Material } from 'cc';
import { Lesson7EffectMode } from './Lesson7PipelineTypes';

const { ccclass, requireComponent, disallowMultiple, property } = _decorator;

@ccclass('Lesson7CameraSettings')
@requireComponent(Camera)
@disallowMultiple()
export class Lesson7CameraSettings extends Component {
    @property({ type: CCBoolean })
    public enablePost = true;

    @property(Material)
    public postMaterial: Material | null = null;

    @property({ type: Enum(Lesson7EffectMode) })
    public effectMode = Lesson7EffectMode.GRAYSCALE;

    @property({ range: [0, 1, 0.05] })
    public strength = 1;

    @property(Color)
    public tintColor = new Color(255, 170, 120, 255);

    @property({ type: CCBoolean })
    public transparentBackground = false;

    @property({ type: CCBoolean })
    public compositeWithAlpha = false;
}