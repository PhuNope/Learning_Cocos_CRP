# Cocos Creator 3.8.8 — Custom Render Pipeline
## Bài 1: Tổng quan RenderGraph và tạo pipeline một pass

> **Phiên bản:** Cocos Creator **3.8.8** · **Ngôn ngữ:** TypeScript · **Mức độ:** Cơ bản  
> **Trạng thái:** Tài liệu học và ví dụ thực nghiệm; **chưa được chạy xác nhận trên máy/project của bạn**.  
> **Ghi chú phiên bản:** Bản này chuẩn hóa lại bài hướng dẫn cũ; phân biệt rõ hạn chế của pipeline tối giản và lỗi WebGPU đã xuất hiện.

## 0. Mục tiêu

Sau bài này, bạn có thể:

1. Giải thích sự khác nhau giữa `PipelineBuilder`, `RenderGraph`, `RenderPass`, `RenderQueue` và `RenderTarget`.
2. Phân biệt `windowResize()` (đăng ký tài nguyên) với `setup()` (xây dựng quy trình render theo frame).
3. Viết pipeline tối giản gồm một raster pass, ba queue và xuất ra `RenderWindow`.
4. Xác nhận custom pipeline đã được đăng ký, đồng thời phân loại lỗi console.

**Giới hạn cố ý của bài:** Chưa tái tạo Builtin Forward; chưa thiết lập shadow pass, PBR lighting đầy đủ, HDR, postprocess, reflection probes, profiler. Đối tượng demo nên dùng `builtin-unlit`.

## 1. Lộ trình khóa học

| Bài | Nội dung | Kết quả thực hành |
|---|---|---|
| 1 | Tổng quan CRP, một pass | Render hình cơ bản |
| 2 | RenderQueue, SceneFlags, phase | Lọc opaque/mask/blend/UI |
| 3 | Viewport, Clear, Depth, nhiều camera | Quan sát các camera và thứ tự |
| 4 | RenderTarget trung gian | Scene → texture |
| 5 | Fullscreen quad và postprocess | Grayscale/invert |
| 6 | Kế thừa/tùy chỉnh Builtin | Pipeline có nền tảng cho dự án thật |
| 7 | Quản lý resolution và tài nguyên | Ổn định resize và multi-camera |
| 8 | Gaussian Blur và Bloom | Chuỗi nhiều pass |
| 9 | Depth/Normal | Hiệu ứng dựa trên scene data |
| 10 | Outline, Depth of Field | Hiệu ứng nâng cao |
| 11 | Shadow map, G-buffer | Hiểu forward/deferred |
| 12 | RenderGraph động, tối ưu | Đo và tối ưu tài nguyên |
| 13 | Dự án tổng hợp | Pipeline cấu hình được |

## 2. Nền tảng tư duy

### 2.1. Pipeline không phải một shader

Một shader mô tả cách xử lý vertex/pixel của một lần draw. Pipeline tổ chức **nhiều draw** và **nhiều bước xử lý**, quyết định nguồn vào, thứ tự và đích kết quả.

```text
Scene + Camera
    |
    v
PipelineBuilder.setup()
    |
    v
RenderGraph
    |
    +-- RenderPass: scene-color (Color + Depth)
    |      +-- Queue: OPAQUE
    |      +-- Queue: MASK
    |      +-- Queue: BLEND / UI
    |
    v
RenderWindow (có thể là màn hình hoặc render texture tùy Camera)
```

### 2.2. Phân biệt các thành phần

| Thành phần | Vai trò | API học trong bài |
|---|---|---|
| `PipelineBuilder` | Định nghĩa cách dựng pipeline | `windowResize`, `setup` |
| `RenderGraph` | Cấu trúc các công đoạn + phụ thuộc tài nguyên | Xây dựng ngầm qua `ppl` |
| `RenderPass` | Một bước raster, có color/depth attachments | `addRenderPass` |
| `RenderQueue` | Tổ chức các nội dung vẽ theo trình tự queue | `addQueue` |
| `SceneFlags` | Chọn nhóm nội dung cần render | `OPAQUE`, `MASK`, `BLEND`, `UI` |
| `QueueHint` | Gợi ý/kiểm tra loại queue; **không lọc đối tượng** | `OPAQUE`, `MASK`, `BLEND` |
| `RenderWindow` | Resource đầu ra gắn với camera/window | `addRenderWindow` |

**Nhớ:** `pass.addQueue(QueueHint.OPAQUE).addScene(camera, SceneFlags.OPAQUE)` — `SceneFlags` là phần chọn nội dung. `QueueHint` không tự động biến object thành opaque.

### 2.3. Cocos 3.8.8 dùng tài liệu nào?

Từ 3.8.4, Builtin đã dùng CRP mới. Các bài cũ có chữ *experimental* hoặc API `addRasterPass`, `addRasterView` kiểu cũ không nên dùng làm nền khi viết ví dụ này. Tham khảo tài liệu **Writing a Customizable Render Pipeline** và mã nguồn engine `v3.8.8` ở phần nguồn.

## 3. Chuẩn bị project/scene

1. Tạo project Cocos Creator **3.8.8**, ưu tiên project thử nghiệm riêng.
2. Bật **New Render Pipeline**, cấu hình pipeline tên `LearnCRP` trong `Project > Project Settings > Graphics Settings > Render Pipeline (New)`.
3. Tạo Scene đơn giản:

```text
Scene
├── Main Camera
├── Cube      (MeshRenderer + builtin-unlit)
├── Sphere    (MeshRenderer + builtin-unlit)
├── Canvas    (tùy chọn)
└── CRPEntry  (gắn LearnCRPPipelineEntry)
```

4. Đảm bảo camera nhìn thấy mesh, chọn màu nền dễ nhận biết; không dùng `builtin-standard` để yêu cầu kiểm chứng lighting trong bài này.
5. Nếu Preview báo lỗi WebGPU 18 uniform buffers / 12 limit, xem mục 7 trước khi học bài tiếp theo.

## 4. File TypeScript hoàn chỉnh

**Đường dẫn:** `assets/scripts/rendering/LearnCRPPipeline.ts`  
**Quan trọng:** Tên đăng ký `LearnCRP` phải khớp với tên pipeline trong Project Settings. Component entry là cách để module có tham chiếu; thao tác đăng ký diễn ra **khi module được nạp**, không đợi `start()`.

```typescript
import {
    _decorator,
    Component,
    gfx,
    renderer,
    rendering,
} from 'cc';

const { ccclass } = _decorator;

class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly clearColor = new gfx.Color();
    private readonly viewport = new gfx.Viewport();

    // Khai báo RenderWindow khi pipeline khởi tạo / resize.
    public windowResize(
        ppl: rendering.BasicPipeline,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number,
    ): void {
        ppl.addRenderWindow(
            window.colorName,
            gfx.Format.RGBA8,
            nativeWidth,
            nativeHeight,
            window,
            window.depthStencilName,
        );
    }

    // Xây dựng RenderGraph cho các camera mỗi frame.
    public setup(
        cameras: renderer.scene.Camera[],
        ppl: rendering.BasicPipeline,
    ): void {
        for (const camera of cameras) {
            if (!camera.scene || !camera.window) continue;
            this.renderCamera(camera, ppl);
        }
    }

    private renderCamera(
        camera: renderer.scene.Camera,
        ppl: rendering.BasicPipeline,
    ): void {
        const window = camera.window;
        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);

        // Viewport đã chuyển từ tỉ lệ sang pixel.
        const v = camera.viewport;
        this.viewport.left = Math.round(v.x * width);
        this.viewport.top = Math.round(v.y * height);
        this.viewport.width = Math.max(Math.round(v.width * width), 1);
        this.viewport.height = Math.max(Math.round(v.height * height), 1);

        const c = camera.clearColor;
        this.clearColor.x = c.x;
        this.clearColor.y = c.y;
        this.clearColor.z = c.z;
        this.clearColor.w = c.w;

        // Một raster pass dùng layout 'default'.
        const pass = ppl.addRenderPass(width, height, 'default');
        pass.setViewport(this.viewport);

        const colorLoad = (camera.clearFlag & gfx.ClearFlagBit.COLOR)
            ? gfx.LoadOp.CLEAR
            : gfx.LoadOp.LOAD;

        pass.addRenderTarget(
            window.colorName,
            colorLoad,
            gfx.StoreOp.STORE,
            this.clearColor,
        );

        const depthStencilClear =
            camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL;

        if (depthStencilClear) {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.STORE,
                camera.clearDepth,
                camera.clearStencil,
                depthStencilClear,
            );
        } else {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.LOAD,
                gfx.StoreOp.STORE,
            );
        }

        // Ba loại mesh + UI: QueueHint chỉ là gợi ý.
        pass.addQueue(rendering.QueueHint.OPAQUE)
            .addScene(camera, rendering.SceneFlags.OPAQUE);

        pass.addQueue(rendering.QueueHint.MASK)
            .addScene(camera, rendering.SceneFlags.MASK);

        pass.addQueue(rendering.QueueHint.BLEND)
            .addScene(
                camera,
                rendering.SceneFlags.BLEND | rendering.SceneFlags.UI,
            );
    }
}

// Quan trọng: đăng ký lúc module được nạp, không đặt trong start().
if (rendering) {
    rendering.setCustomPipeline('LearnCRP', new LearnCRPPipeline());
}

// Gắn component này lên một Node để module được tham chiếu trong project.
@ccclass('LearnCRPPipelineEntry')
export class LearnCRPPipelineEntry extends Component {}
```

> Tên `default` truyền vào `addRenderPass()` là tên layout liên quan đến shader/descriptor, không phải tên log tùy ý. Các queue ở đây dùng phase mặc định (`default`).

## 5. Phân tích từng phần

### 5.1. `windowResize()`

```typescript
ppl.addRenderWindow(
    window.colorName,
    gfx.Format.RGBA8,
    nativeWidth,
    nativeHeight,
    window,
    window.depthStencilName,
);
```

- Đăng ký color output và depth/stencil name để những pass sau đó tham chiếu.
- Với swapchain có sẵn depth/stencil, `addRenderWindow` liên kết attachment tương ứng; với trường hợp khác, pipeline có thể quản lý một depth/stencil phù hợp.
- Đăng ký **không đồng nghĩa** buộc cấp phát một texture riêng ngay lập tức.

### 5.2. `setup()`

- Được gọi để dựng RenderGraph theo frame; danh sách `cameras` đã có thứ tự render của engine.
- Bỏ qua camera không có scene/window để tránh null-reference.
- Ví dụ khởi tạo một pass cho từng camera hợp lệ.

### 5.3. Attachment + Clear

```typescript
pass.addRenderTarget(
    window.colorName,
    gfx.LoadOp.CLEAR,
    gfx.StoreOp.STORE,
    this.clearColor,
);
```

- `CLEAR`: đặt giá trị ban đầu cho attachment.
- `LOAD`: giữ nội dung attachment từ trước pass.
- `STORE`: yêu cầu lưu output sau pass.
- `DISCARD`: không yêu cầu giữ output cho bước sau.
- Trong ví dụ hoàn chỉnh, `LOAD/CLEAR` được lựa chọn theo `camera.clearFlag`.

Depth test giúp mesh phía trước che mesh phía sau, **không tự tạo ra bóng đổ**. Shadow map là phần riêng cần các pass/lights bổ sung.

### 5.4. Ba queue

```typescript
pass.addQueue(rendering.QueueHint.OPAQUE)
    .addScene(camera, rendering.SceneFlags.OPAQUE);
pass.addQueue(rendering.QueueHint.MASK)
    .addScene(camera, rendering.SceneFlags.MASK);
pass.addQueue(rendering.QueueHint.BLEND)
    .addScene(camera, rendering.SceneFlags.BLEND | rendering.SceneFlags.UI);
```

Trật tự **giữa** các queue được duy trì theo thứ tự thêm. Không nên hiểu rằng `SceneFlags` hay `QueueHint` tự quy định thứ tự chính xác của từng mesh **bên trong** một queue; còn có logic sorting của engine/renderer.

### 5.5. Những điều ví dụ này **không** làm

- Không tái tạo toàn bộ shadow & lighting được Builtin pipeline triển khai.
- Không có texture trung gian, postprocessing, framebuffer feedback.
- Không có quản lý nhiều màn hình/viewport phức tạp.
- Không đại diện cho pipeline production hoàn chỉnh trên tất cả backend.

## 6. Quy trình kiểm thử

1. Mở Preview, xem log `Cocos Creator v3.8.8` và `Using custom pipeline: LearnCRP`.
2. Xác nhận Cube và Sphere unlit xuất hiện với màu material.
3. Di chuyển một mesh ra phía trước mesh còn lại để nhìn depth test.
4. Đổi `Clear Color` của Camera để quan sát màu nền.
5. Tạm ẩn Cube/Sphere và đối chiếu cách camera clear output.

**Điều kiện thành công:** Có log chọn pipeline và hình demo có thể nhìn thấy. Chỉ có log chọn pipeline **chưa chứng minh** tất cả draw đã hoạt động.

## 7. Gỡ lỗi — đặc biệt lưu ý sự cố WebGPU trước đó

Bạn đã thấy:

```text
Using custom pipeline: LearnCRP
The number of uniform buffers (18) in the Vertex stage
exceeds the maximum per-stage limit (12).
While calling [Device].CreatePipelineLayout(...)
```

Phần đầu xác nhận tên pipeline được sử dụng; phần sau là lỗi kiểm tra giới hạn **WebGPU pipeline layout** (18 uniform-buffer bindings so với giới hạn 12 mà thiết bị/backend báo). **Chưa đủ bằng chứng** để kết luận các queue ở ví dụ trực tiếp tạo ra 18 UBO. Có thể liên quan tới shader, layout hoặc cách engine/backend kết hợp descriptor.

Quy trình xác định nguyên nhân:

1. **Cùng Scene + cùng trình duyệt/backend**, đổi pipeline từ `LearnCRP` sang `Builtin` và chạy lại.
2. Nếu cả hai lỗi, kiểm tra WebGPU/backend/material và dùng scene tối giản.
3. Nếu chỉ `LearnCRP` lỗi, kiểm tra riêng cách ghép custom pass/layout và shader; chưa nên sửa shader theo phỏng đoán.
4. Thử WebGL2 chỉ là phép thử phân lập vấn đề WebGPU, không phải chứng minh code đã đúng toàn bộ.
5. `onboarding.js` và `content-script.js` nhiều khả năng đến từ browser extension; cảnh báo non-passive wheel ở `mouse-input.ts` không phải lỗi UBO.

**Điểm dừng:** Nếu UBO 18/12 vẫn xuất hiện và render thất bại, cần xử lý lỗi nền tảng trước khi đánh giá kết quả render của Bài 2. Đổi các queue không bảo đảm sửa lỗi này.

## 8. Bài tập và đáp án

**Bài A:** Vì sao không đặt `rendering.setCustomPipeline()` trong `start()`?  
**Đáp án:** Vì pipeline cần được đăng ký trước khi engine chọn builder cho render; `start()` chạy ở lifecycle scene/component, có thể quá muộn.

**Bài B:** Đổi `QueueHint.OPAQUE` thành `QueueHint.BLEND` nhưng giữ `SceneFlags.OPAQUE`, có mặc nhiên chuyển mesh sang transparent không?  
**Đáp án:** Không. `QueueHint` không quyết định blending hay filter object.

**Bài C:** `LoadOp.CLEAR` ở **pass** hay **queue**?  
**Đáp án:** Ở attachment của pass.

**Bài D:** Vì sao `builtin-standard` có thể không cho kết quả như Builtin?  
**Đáp án:** Ví dụ không thiết lập đầy đủ lighting, shadow và các pass của Builtin.

## 9. Sang Bài 2

Ta giữ nguyên tên custom pipeline, **thay nội dung file `LearnCRPPipeline.ts`** bằng bản Bài 2 và thử nhiều chế độ queue: Opaque only, Mask only, Blend only, UI only, Split vs Single Queue.

## 10. Nguồn đối chiếu

- [Cocos 3.8 — Writing a Customizable Render Pipeline](https://docs.cocos.com/creator/3.8/manual/en/render-pipeline/write-render-pipeline.html)
- [Cocos 3.8 — Render Pipeline Overview](https://docs.cocos.com/creator/3.8/manual/en/render-pipeline/overview.html)
- [Engine `v3.8.8` — `cocos/rendering/custom/pipeline.ts`](https://github.com/cocos/cocos-engine/blob/v3.8.8/cocos/rendering/custom/pipeline.ts)
- [Cocos 3.8 — Builtin Unlit](https://docs.cocos.com/creator/3.8/manual/en/shader/effect-builtin-unlit.html)
