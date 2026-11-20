# Cocos Creator 3.8.8 — Custom Render Pipeline
## Bài 2: RenderQueue, SceneFlags, QueueHint và thứ tự vẽ

> **Tiếp nối Bài 1** · **Mức độ:** Cơ bản → trung bình · **Mục tiêu:** Chủ động chọn nhóm object được render.  
> **Trạng thái:** Ví dụ dựa theo API/source chính thức 3.8.8; chưa chạy xác nhận trên project của bạn.  
> **Lưu ý:** Nếu WebGPU còn báo lỗi `uniform buffers (18) > limit (12)`, phải phân lập lỗi ấy trước; thay đổi queue không bảo đảm khắc phục.

## 1. Tóm tắt bài trước (30 giây)

```text
PipelineBuilder.setup()
      |
      v
 RenderPass (color + depth)
      |
      +-- Queue 1: Scene content
      +-- Queue 2: Scene content
      +-- Queue 3: Scene content
      |
      v
  RenderWindow
```

`RenderPass` chuẩn bị attachments và các queue. `addQueue()` **không** tạo render target mới. Tất cả queue trong cùng pass dùng attachment của pass đó.

## 2. Ba khái niệm rất dễ nhầm

### 2.1. `QueueHint`: gợi ý, không phải bộ lọc

```typescript
pass.addQueue(rendering.QueueHint.OPAQUE);
```

Tài liệu interface Cocos 3.8.8 ghi rõ: queue hint dùng để **kiểm tra mục đích sử dụng**, không tác động tới nội dung render. Các giá trị thường gặp: `NONE`, `OPAQUE`, `MASK`, `BLEND`.

Thay hint không tự thay đổi alpha blending, depth write hay phân loại material.

### 2.2. `SceneFlags`: chọn nội dung cần vẽ

```typescript
pass.addQueue(rendering.QueueHint.OPAQUE)
    .addScene(camera, rendering.SceneFlags.OPAQUE);
```

| Flag | Nhóm nội dung hướng đến |
|---|---|
| `OPAQUE` | Mesh/material không trong suốt |
| `MASK` | Alpha-test / cutout |
| `BLEND` | Vật thể transparent/blended |
| `UI` | Nội dung UI phù hợp với camera đang render |

Các flags là bit flags, gộp bằng `|`:

```typescript
const combined = rendering.SceneFlags.OPAQUE
    | rendering.SceneFlags.MASK
    | rendering.SceneFlags.BLEND;
```

**Không nhầm** `SceneFlags.MASK` với component `UI Mask`; ở đây nó mô tả nhóm render có alpha testing. `SceneFlags` cũng có những giá trị khác như `SHADOW_CASTER` và các tùy chọn kỹ thuật; bài này chỉ tập trung vào bốn nhóm cơ bản.

### 2.3. `phaseName` của queue: khớp với Effect

Chữ ký trong engine 3.8.8:

```typescript
pass.addQueue(hint?, phaseName?, passName?);
```

`phaseName` mặc định là `'default'` và dùng để chọn các material passes có phase phù hợp. Ví dụ:

```typescript
pass.addQueue(
    rendering.QueueHint.OPAQUE,
    'default',
).addScene(camera, rendering.SceneFlags.OPAQUE);
```

Nếu bạn ghi một phase chưa được khai báo trong Effect, một số vật thể có thể **biến mất dù SceneFlags đúng**. Đừng dùng `phaseName` để đặt tên debug ngẫu nhiên.

## 3. Thứ tự chính xác là gì?

```text
RenderPass
  |
  +-- Queue A (OPAQUE) ------- hoàn tất trước B
  |
  +-- Queue B (MASK) --------- hoàn tất trước C
  |
  +-- Queue C (BLEND + UI)
```

- **Giữa các queue**: có thứ tự theo cách chúng được xây dựng.
- **Bên trong một queue**: không có cam kết các object được vẽ theo thứ tự node trong Hierarchy. Renderer có thể sort vì depth, transparency, batching, material, phase, ...
- **Giữa các pass**: còn phụ thuộc tài nguyên/đồ thị và cách bạn xây dựng pipeline; nội dung này học ở Bài 4.

Vì thế, chia queue theo loại object mang ý nghĩa tổ chức/kiểm tra; `SINGLE_QUEUE` không tương đương `SPLIT_ALL` về mặt bảo đảm thứ tự các nhóm.

## 4. Chuẩn bị Scene thử nghiệm

Tạo 4 nội dung nhìn thấy qua camera (dùng `builtin-unlit` để tránh phụ thuộc lighting):

```text
Scene
├── Main Camera
├── CubeOpaque       [Cube, material unlit bình thường]
├── PlaneCutout      [Plane, material unlit + USE_ALPHA_TEST]
├── PanelTransparent [Plane/Cube, material bật blending]
├── Canvas
│   └── UI_Label     [label: "QUEUE TEST"]
└── CRPEntry         [LearnCRPPipelineEntry]
```

**Lưu ý thực hành material:**

- **Opaque:** `builtin-unlit`, không alpha test, không blending.
- **Mask/Cutout:** Tạo material `builtin-unlit`, bật `USE_ALPHA_TEST`, gán texture có vùng alpha bằng 0 và 1; đặt `alphaThreshold` phù hợp. *Nếu texture hoàn toàn opaque, bạn khó nhìn ra khác biệt.*
- **Blend:** Không chỉ giảm alpha trong màu mà phải kiểm tra material **đã thực sự bật blending**. Cần cấu hình pipeline states/material phù hợp; kết quả phụ thuộc material/effect bạn dùng.
- **UI:** Có thể dùng `Label` trong Canvas. Nếu camera UI riêng hoặc có nhiều camera, hiệu ứng `UI_ONLY` cần được đánh giá với từng camera và `Visibility` tương ứng.

Để dễ quan sát, cho các vật thể nằm ở các vị trí **khác nhau** trong khung hình, chưa cần xếp chồng trong lượt thử đầu.

## 5. Viết code — thay thế toàn bộ file của Bài 1

**Đường dẫn:** `assets/scripts/rendering/LearnCRPPipeline.ts`.

**Không giữ hai bản đăng ký `LearnCRP` cùng lúc**. Nếu có file/entry cũ và mới cùng đăng ký tên pipeline, hãy chỉ giữ một phiên bản.

```typescript
import {
    _decorator,
    Component,
    gfx,
    renderer,
    rendering,
} from 'cc';

const { ccclass } = _decorator;

type QueueMode =
    | 'SPLIT_ALL'    // Opaque -> Mask -> Blend/UI
    | 'SINGLE_QUEUE' // Tất cả trong một queue (không bảo đảm thứ tự nội bộ)
    | 'OPAQUE_ONLY'
    | 'MASK_ONLY'
    | 'BLEND_ONLY'
    | 'UI_ONLY'
    | 'NO_CONTENT';

// Mỗi lượt thử đổi giá trị này rồi chạy lại Preview.
const QUEUE_MODE: QueueMode = 'SPLIT_ALL';

class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly clearColor = new gfx.Color();
    private readonly viewport = new gfx.Viewport();

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

    public setup(
        cameras: renderer.scene.Camera[],
        ppl: rendering.BasicPipeline,
    ): void {
        for (const camera of cameras) {
            if (!camera.scene || !camera.window) continue;
            this.buildCameraPass(camera, ppl);
        }
    }

    private buildCameraPass(
        camera: renderer.scene.Camera,
        ppl: rendering.BasicPipeline,
    ): void {
        const window = camera.window;
        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);

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

        const pass = ppl.addRenderPass(width, height, 'default');
        pass.setViewport(this.viewport);

        // Clear là thuộc tính của pass, KHÔNG thuộc tính của queue.
        const colorLoad = (camera.clearFlag & gfx.ClearFlagBit.COLOR)
            ? gfx.LoadOp.CLEAR
            : gfx.LoadOp.LOAD;
        pass.addRenderTarget(
            window.colorName,
            colorLoad,
            gfx.StoreOp.STORE,
            this.clearColor,
        );

        const clearDS = camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL;
        if (clearDS) {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.STORE,
                camera.clearDepth,
                camera.clearStencil,
                clearDS,
            );
        } else {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.LOAD,
                gfx.StoreOp.STORE,
            );
        }

        this.addQueues(pass, camera);
    }

    private addQueues(
        pass: rendering.BasicRenderPassBuilder,
        camera: renderer.scene.Camera,
    ): void {
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

if (rendering) {
    console.info('[LearnCRP] queue mode:', QUEUE_MODE);
    rendering.setCustomPipeline('LearnCRP', new LearnCRPPipeline());
}

@ccclass('LearnCRPPipelineEntry')
export class LearnCRPPipelineEntry extends Component {}
```

**Cách dùng:** thay giá trị `QUEUE_MODE`, ví dụ:

```typescript
const QUEUE_MODE: QueueMode = 'OPAQUE_ONLY';
```

Lưu, đợi project cập nhật và chạy lại Preview để so sánh. Việc đổi hằng số TypeScript **không** phải là UI control thời gian thực.

## 6. Thực nghiệm từng chế độ

| `QUEUE_MODE` | Kỳ vọng trong scene thử nghiệm |
|---|---|
| `SPLIT_ALL` | Vẽ opaque → mask → blend và UI (nếu camera cho phép) |
| `OPAQUE_ONLY` | Opaque xuất hiện; cutout, transparent, UI không được queue này chọn |
| `MASK_ONLY` | Chỉ nội dung được engine phân loại alpha-test |
| `BLEND_ONLY` | Chỉ nội dung blend/transparent; UI không tự động có mặt |
| `UI_ONLY` | Nội dung UI phù hợp camera; mesh thường không được chọn |
| `SINGLE_QUEUE` | Cùng tập SceneFlags với `SPLIT_ALL`, nhưng **không cam kết** trình tự các nhóm bên trong một queue |
| `NO_CONTENT` | Pass vẫn clear framebuffer nếu camera yêu cầu, nhưng không thêm draw Scene nào |

**Chú ý:** Hình thực tế phụ thuộc shader/material state, camera visibility, clear flags và backend. Đây là **kỳ vọng cần kiểm tra**, không phải kết quả đã được xác nhận.

### Thí nghiệm A: Phân biệt `QueueHint` với `SceneFlags`

Thay riêng đoạn:

```typescript
pass.addQueue(H.OPAQUE).addScene(camera, S.OPAQUE);
```

thành:

```typescript
pass.addQueue(H.BLEND).addScene(camera, S.OPAQUE);
```

**Dự đoán:** Nhóm opaque vẫn được yêu cầu render; không tự trở thành transparent. Đây là bài kiểm chứng rằng hint khác filter.

### Thí nghiệm B: `LoadOp.CLEAR` không thuộc queue

Chọn `NO_CONTENT`, giữ `Camera Clear Flags` có Color. Kỳ vọng màn hình sẽ có màu clear nhưng không thấy scene được vẽ bằng pipeline này. Nếu có camera khác hoặc nội dung ngoài pass, chúng vẫn có thể ảnh hưởng output.

### Thí nghiệm C: Tách hay gộp queue

So sánh `SPLIT_ALL` với `SINGLE_QUEUE`, đặc biệt khi đưa hai mặt phẳng transparent chồng nhau. **Không được mặc định** khác biệt sẽ luôn quan sát thấy: tùy material và logic sorting của renderer, hai kết quả có thể trông giống nhau.

### Thí nghiệm D: `MASK_ONLY`

Nếu `MASK_ONLY` cho màn hình trống, kiểm tra material có thực sự bật alpha test, texture có alpha, component MeshRenderer có mặt, layer/camera visibility đúng hay không. Không nên kết luận ngay rằng `SceneFlags.MASK` không hoạt động.

## 7. Hiểu rõ Depth và Transparency

### 7.1. Opaque và depth test

Hai Cube chồng lên nhau:

```text
Camera --- Cube gần --- Cube xa
```

Nếu shader/material bật depth testing và depth được xử lý đúng, các pixel của Cube gần có thể che Cube xa. Tuy nhiên, engine có thể thay đổi thứ tự vẽ để tối ưu; thứ tự vẽ **không đồng nhất** với thứ tự nhìn thấy.

### 7.2. Transparent và alpha blending

Một mô hình blending phổ biến:

```text
FinalColor = SrcColor * SrcAlpha + DstColor * (1 - SrcAlpha)
```

Đây là **một công thức blending thường gặp**, không phải bảo đảm mọi material trong engine đều dùng chính xác công thức này. Vật thể transparent có thể cần thứ tự xa → gần, song sorting và depth settings của material ảnh hưởng kết quả.

### 7.3. `MASK` không phải `BLEND`

- `MASK`: pixel bị loại bỏ khi không đạt alpha test, các pixel còn lại thường xử lý như bề mặt không trong suốt.
- `BLEND`: pixel có thể pha trộn với pixel đã có trên color target.
- Việc phân nhóm phụ thuộc pass state/shader thực tế chứ **không** chỉ tên Node/Material.

## 8. Hiểu thêm về camera và UI

Mỗi camera được `setup()` xử lý riêng trong vòng lặp. Nếu có Camera 3D và Camera UI:

1. Camera 3D có thể vẽ mesh.
2. Camera UI có thể vẽ Label/Sprite tùy culling mask, visibility, clear flags và thiết lập Canvas.
3. Camera sau có thể `LOAD` hoặc `CLEAR` attachment. Nếu clear color, kết quả camera trước có thể bị che/xóa.

**Vì vậy:** Khi test các chế độ đầu tiên, hãy bắt đầu với một camera rõ ràng; sau đó mới thêm camera UI thứ hai để tránh nhầm lỗi queue với thứ tự camera. Bài 3 sẽ phân tích riêng trường hợp multi-camera.

## 9. Sự cố thường gặp

| Hiện tượng | Kiểm tra |
|---|---|
| Console có `Using custom pipeline: LearnCRP`, nhưng đen | Camera, material, viewport, SceneFlags, phaseName, GPU errors |
| `MASK_ONLY` không thấy gì | `USE_ALPHA_TEST`/alpha texture đã thiết lập thực sự chưa? |
| `BLEND_ONLY` không thấy vật thể alpha=0.5 | Material có bật Blend State hay chỉ chỉnh màu alpha? |
| UI mất | Canvas, camera visibility, clear flags, UI camera |
| `SINGLE_QUEUE` giống `SPLIT_ALL` | Không sai: không có bảo đảm khác biệt trực quan trong mọi scene |
| WebGPU 18 UBO / 12 limit | Đổi Builtin cùng scene/backend để phân lập, **đừng kết luận queue là nguyên nhân** |
| `TS2307 Cannot find module 'cc'` | Đây là vấn đề nhận diện type/tsconfig của project/IDE, phân biệt với lỗi render runtime |

**Không phải phần của bài này:** nếu GPU pipeline layout không được tạo, bài test hình ảnh sẽ không đáng tin cậy. Nên sửa hoặc phân lập lỗi đó trước khi tiếp tục tới postprocess.

## 10. Bài tập tự làm

**Bài 1 — dự đoán:** Nếu `QueueHint.MASK` nhưng `SceneFlags.OPAQUE`, nhóm nào được chọn?  
**Đáp án:** Opaque (theo SceneFlags), không phải Mask.

**Bài 2 — sửa:** Thêm chế độ `OPAQUE_AND_MASK` bằng hai queue riêng.  
**Gợi ý:** `pass.addQueue(H.OPAQUE).addScene(camera, S.OPAQUE)` rồi `pass.addQueue(H.MASK).addScene(camera, S.MASK)`.

**Bài 3 — giải thích:** Vì sao `SINGLE_QUEUE` không thể dùng để chứng minh thứ tự opaque → mask → blend?  
**Đáp án:** Thứ tự giữa queue được tổ chức riêng; thứ tự render nội dung *trong* một queue không được cam kết như thứ tự giữa các queue.

**Bài 4 — debug:** Khi `UI_ONLY` mất Label nhưng `SPLIT_ALL` vẫn thấy, cần kiểm tra gì?  
**Gợi ý:** camera/UI camera, Canvas, phase, material, culling mask, clear flags, liệu Label thực sự nằm ở pass/camera đang render hay không.

## 11. Tiêu chí hoàn thành Bài 2

- [ ] Hiểu `QueueHint` là hint, `SceneFlags` là filter, `phaseName` liên kết Effect.
- [ ] Thay được chế độ trong mã và chạy Preview.
- [ ] So sánh được ít nhất `OPAQUE_ONLY`, `BLEND_ONLY`, `SPLIT_ALL`.
- [ ] Thử `MASK_ONLY` với material alpha test thật.
- [ ] Mô tả được vì sao `SINGLE_QUEUE` không bảo đảm thứ tự các nhóm.
- [ ] Không nhầm GPU layout error với lỗi filtering của queue.

## 12. Bài 3 sẽ học gì?

**Camera/Viewport/Depth/Clear**: Thiết kế tình huống hai camera render chung output; phân biệt `CLEAR` và `LOAD`, xử lý viewport 0–1 → pixel, depth buffer và chồng ghép camera. Bài 3 cũng sẽ có Markdown độc lập để lưu vào thư viện học tập.

## 13. Nguồn đối chiếu

- [Cocos 3.8 — Writing a Customizable Render Pipeline](https://docs.cocos.com/creator/3.8/manual/en/render-pipeline/write-render-pipeline.html)
- [Engine `v3.8.8` — Pipeline interfaces (`addQueue`, `addScene`, `BasicPipeline`)](https://github.com/cocos/cocos-engine/blob/v3.8.8/cocos/rendering/custom/pipeline.ts)
- [Cocos 3.8 — Builtin Unlit / `USE_ALPHA_TEST`](https://docs.cocos.com/creator/3.8/manual/en/shader/effect-builtin-unlit.html)
- [Cocos example: tutorial-001 (tham khảo cấu trúc)](https://github.com/cocos/cocos-example-custom-pipeline/blob/master/assets/examples/tutorial-001/pipeline-001.ts)
