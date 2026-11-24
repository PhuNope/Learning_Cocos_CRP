import { gfx, Material, renderer } from 'cc';

/** Mô tả tài nguyên của MỘT camera, trên MỘT RenderWindow. */
export interface Lesson9ResourceNames {
    sceneColor: string;
    sceneDepth: string;
    halfBright: string;
    quarterDown: string;
    quarterBlurH: string;
    quarterBlurV: string;
    halfBloom: string;
    combined: string;
}

export interface Lesson9BloomConfig {
    material: Material;
    threshold: number;       // 0..1; Bài 9 dùng RGBA8/LDR
    softKnee: number;        // 0.01..0.5
    intensity: number;       // 0..2
    blurRadius: number;      // khoảng cách lấy mẫu theo texel 1/4
    detailWeight: number;    // tỉ lệ dữ liệu 1/2 khi upsample
    glowAlphaStrength: number;
    transparentBackground: boolean;
    compositeWithAlpha: boolean;
}

export interface Lesson9CameraConfig {
    camera: renderer.scene.Camera;
    window: renderer.RenderWindow;
    width: number;
    height: number;
    halfWidth: number;
    halfHeight: number;
    quarterWidth: number;
    quarterHeight: number;
    viewport: gfx.Viewport;
    fullViewport: boolean;
    firstInWindow: boolean;
    resources: Lesson9ResourceNames;
    resourcesReady: boolean;
    applyBloom: boolean;
    bloom: Lesson9BloomConfig | null;
}
