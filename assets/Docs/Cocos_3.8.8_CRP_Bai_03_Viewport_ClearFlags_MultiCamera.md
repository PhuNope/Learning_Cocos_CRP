# Cocos Creator 3.8.8 — Custom Render Pipeline
## Bài 3: Viewport, Clear Flags, Depth Buffer và nhiều Camera

> **Tiếp nối:** Bài 1 (RenderPass/RenderTarget) và Bài 2 (RenderQueue/SceneFlags).  
> **Trình độ:** Cơ bản → trung bình.  
> **Mục tiêu cuối bài:** Camera A render thế giới 3D, Camera B render nội dung bổ sung **lên cùng màn hình mà không xóa màu của Camera A**.  
> **Trạng thái:** Ví dụ dựa trên tài liệu Cocos 3.8 và mã nguồn `v3.8.8`; chưa chạy xác nhận trong project của bạn.  
> **Điều kiện:** Nếu project vẫn báo `uniform buffers (18) > per-stage limit (12)` trên WebGPU, hãy so sánh Builtin/WebGL2 và thử scene tối giản; lỗi đó **không được giải quyết chỉ bằng đổi ClearFlags**.

---

## 0. Kết nối với lộ trình

- Bài 1: `PipelineBuilder`, `RenderPass`, RenderTarget, DepthStencil.
- Bài 2: Opaque, Mask, Blend, UI, `QueueHint`, `SceneFlags`.
- **Bài 3 (bài này):** `ClearFlags`, `LoadOp`, `StoreOp`, `Viewport`, `priority`, `Visibility`, Camera xếp chồng.
- Bài 4 (sắp tới): Render Scene sang texture trung gian; thêm pass xử lý texture.

Mục tiêu không phải chép code mà là trả lời được: **Tại sao Camera thứ hai làm mất hình Camera thứ nhất, mặc dù chỉ vẽ một Cube?**

## 1. Phân biệt RenderWindow, RenderPass, RenderQueue và Viewport

```text
Frame
  |
  +-- Camera A (Priority 0)
  |     |
  |     +-- RenderPass A
  |           |-- Color: CLEAR  -> STORE
  |           |-- Depth: CLEAR  -> STORE
  |           +-- OPAQUE / MASK / BLEND queues
  |                  |
  |                  v
  |               RenderWindow
  |
  +-- Camera B (Priority 10)
        |
        +-- RenderPass B
              |-- Color: LOAD   -> STORE
              |-- Depth: CLEAR  -> STORE
              +-- OPAQUE / MASK / BLEND queues
                     |
                     v
                Cùng RenderWindow
```

- **RenderWindow**: đích đầu ra của Camera (mặc định là màn hình).
- **RenderPass**: thao tác vẽ dùng các attachment màu và depth/stencil.
- **RenderQueue**: tập công việc vẽ Scene bên trong pass.
- **Viewport**: vùng tọa độ đích nơi rasterization ánh xạ các pixel. Viewport **không tự tạo một RenderTarget riêng**.

### 1.1. `LoadOp` và `StoreOp`

| Thuộc tính | Ý nghĩa | Bài học quan trọng |
|---|---|---|
| `gfx.LoadOp.CLEAR` | Xóa attachment lúc mở pass | Có thể xóa kết quả pass trước |
| `gfx.LoadOp.LOAD` | Giữ nội dung attachment đã có | Chỉ hợp lệ khi nội dung trước đó đã được tạo/lưu hợp lệ |
| `gfx.StoreOp.STORE` | Cần giữ nội dung sau pass | Phù hợp khi Camera/pass kế tiếp còn dùng |
| `gfx.StoreOp.DISCARD` | Không cần giữ nội dung sau pass | Không dùng nếu pass sau cần đọc lại depth/color |

`LOAD` **không phải** sampling texture trong shader: nó yêu cầu giữ nội dung attachment ở đầu raster pass.

### 1.2. Clear Color và Clear Depth là hai việc khác nhau

- **Color** là RGBA pixel cuối cùng.
- **Depth** ghi độ sâu phục vụ depth test.
- `Color = LOAD`, `Depth = CLEAR`: giữ hình từ Camera A nhưng Camera B được phép bắt đầu kiểm tra chiều sâu mới.
- `Color = LOAD`, `Depth = LOAD`: giữ cả màu và độ sâu; vật thể của Camera B có thể bị depth cũ che nếu ở xa hơn vật thể của Camera A.
- `Color = CLEAR`, `Depth = CLEAR`: Camera B có thể xóa toàn bộ ảnh Camera A rồi vẽ lại.

**Quan trọng:** `LoadOp.CLEAR` xảy ra trên **attachment của pass**, không được hiểu là “chỉ xóa hình trong viewport” vì `pass.setViewport()` không bảo đảm giới hạn vùng clear attachment. Đây là bẫy rất phổ biến khi thử mini-map hoặc split-screen.

## 2. Camera có thứ tự thế nào trong Cocos 3.8.8?

Trong `cocos/root.ts` của đúng tag `v3.8.8`, engine có dòng:

```typescript
cameraList.sort((a, b) => a.priority - b.priority);
```

Do đó **priority nhỏ render trước, priority lớn render sau**. Ví dụ Camera 0 → Camera 10.

> **Lưu ý tài liệu:** Trang Camera manual có câu mô tả "high-priority first" không nhất quán với đoạn mã engine này. Khi nghiên cứu chính xác v3.8.8, ưu tiên đoạn mã đã kiểm chứng trên tag và dùng log để xác nhận thứ tự trong project.

Không tự `.sort()` mảng `cameras` được truyền vào `setup()`: mảng đã được engine chuẩn bị theo thứ tự render.

## 3. `Visibility` và `Layer` độc lập với `ClearFlags`

Bạn cần phân biệt hai câu hỏi:

1. **Camera được phép vẽ cái gì?** → `Camera.Visibility` và `Node.Layer`, sau đó tới `SceneFlags` của queue.
2. **Camera có xóa kết quả vẽ của Camera trước không?** → `Camera.clearFlag` + `LoadOp` của pass.

Ví dụ Camera A chỉ nhìn `DEFAULT`; Camera B chỉ nhìn `UI_3D`:

```text
WorldCube  [Layer: DEFAULT] ----- Camera A [Visibility: DEFAULT]
OverlayCube[Layer: UI_3D] ------ Camera B [Visibility: UI_3D]
```

`Visibility` là bitmask các layer; set sai có thể khiến Cube biến mất dù ClearFlags hoàn toàn đúng.

## 4. Dựng Scene thực hành

Trong **Scene mới** (không thêm Canvas lúc đầu), tạo:

```text
Scene
├── CameraWorld      [Camera, Priority = 0]
├── CameraOverlay    [Camera, Priority = 10]
├── WorldCube        [MeshRenderer, Layer DEFAULT]
├── OverlayCube      [MeshRenderer, Layer UI_3D]
└── CRPEntry         [LearnCRPPipelineEntry]
```

Cấu hình:

| Thuộc tính | CameraWorld | CameraOverlay |
|---|---|---|
| Priority | `0` | `10` |
| Visibility | Chỉ `DEFAULT` | Chỉ `UI_3D` |
| ClearFlags | `SOLID_COLOR` | `DEPTH_ONLY` |
| Rect / Viewport | `(0,0,1,1)` | `(0,0,1,1)` |
| TargetTexture | `null` | `null` |
| Position/Rotation | Nhìn WorldCube | Nhìn OverlayCube |

- Cả hai Cube dùng material **`builtin-unlit`**, chọn hai màu dễ phân biệt.
- Đặt OverlayCube lệch sang phải so với WorldCube để kết quả cơ bản dễ quan sát. Sau đó thử cho hai Cube chồng lên nhau để kiểm tra độ sâu.
- Có thể cho hai Camera cùng transform hoặc cùng nhìn về tâm; bảo đảm camera của mỗi đối tượng có frustum phù hợp.
- Không cho `CameraWorld` nhìn thấy layer `UI_3D` và ngược lại.
- **Chạy trên Preview Game** trước; scene editor có thể có camera phụ.

### Tại sao CameraOverlay chọn DEPTH_ONLY?

`DEPTH_ONLY` nói với pipeline rằng:

- Color: giữ lại hình CameraWorld (`LOAD`).
- Depth: dọn buffer độ sâu (`CLEAR`) cho lượt vẽ của CameraOverlay.

Nó phù hợp để vẽ một lớp 3D overlay không bị depth của thế giới che. Nếu mục tiêu là **vật thể của hai Camera che khuất nhau đúng theo chiều sâu toàn cục**, bạn cần cân nhắc giữ depth (`LOAD`) và bảo đảm cả hai camera sử dụng cùng phép chiếu/không gian depth tương thích; sẽ không đủ chỉ thay một cờ.

## 5. Code hoàn chỉnh — thay `LearnCRPPipeline.ts`

Đường dẫn: `assets/scripts/rendering/LearnCRPPipeline.ts`.

**Quan trọng:** Thay thế bản từ Bài 2, KHÔNG tạo thêm một file đăng ký `LearnCRP` cùng tên. Chỉ giữ **một** lời gọi `setCustomPipeline('LearnCRP', ...)`.

```typescript
import {
    _decorator,
    Component,
    gfx,
    renderer,
    rendering,
} from 'cc';

const { ccclass } = _decorator;

/**
 * Đổi hằng số này trước khi Preview để làm thí nghiệm.
 * CAMERA_FLAGS = cấu hình ClearFlags từ từng Camera trong Inspector.
 */
type ClearExperiment =
    | 'CAMERA_FLAGS'
    | 'FORCE_LATER_COLOR_CLEAR'
    | 'FORCE_LATER_COLOR_LOAD'
    | 'FORCE_LATER_DEPTH_LOAD'
    | 'FORCE_LATER_DEPTH_CLEAR';

const EXPERIMENT: ClearExperiment = 'CAMERA_FLAGS';

class LearnCRPPipeline implements rendering.PipelineBuilder {
    private readonly viewport = new gfx.Viewport();
    private readonly clearColor = new gfx.Color();
    private debugFramesRemaining = 2;

    public windowResize(
        ppl: rendering.BasicPipeline,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number,
    ): void {
        // Đăng ký Color + DepthStencil của chính RenderWindow.
        // Các camera cùng render vào một window sẽ dùng chung tên resource.
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
        // Đếm số camera đã render trong cùng một RenderWindow.
        // Chú ý: camera thứ hai trên màn hình không nhất thiết có index=1
        // nếu scene có Canvas, Editor camera, hoặc cửa sổ render khác.
        const windowCameraCounts = new Map<string, number>();

        if (this.debugFramesRemaining > 0) {
            console.log('[LearnCRP:Bai3] API:', ppl.device.gfxAPI);
            console.log('[LearnCRP:Bai3] experiment:', EXPERIMENT);
        }

        // Engine v3.8.8 đã sắp xếp camera theo priority tăng dần.
        for (let index = 0; index < cameras.length; index++) {
            const camera = cameras[index];
            if (!camera.scene || !camera.window) continue;

            const name = camera.window.colorName;
            const withinWindowIndex = windowCameraCounts.get(name) ?? 0;
            windowCameraCounts.set(name, withinWindowIndex + 1);

            if (this.debugFramesRemaining > 0) {
                console.log('[LearnCRP:Bai3] camera', {
                    globalIndex: index,
                    withinWindowIndex,
                    name: camera.node?.name ?? '(no node)',
                    priority: camera.priority,
                    clearFlag: camera.clearFlag,
                    viewport: {
                        x: camera.viewport.x,
                        y: camera.viewport.y,
                        width: camera.viewport.width,
                        height: camera.viewport.height,
                    },
                    colorName: camera.window.colorName,
                    depthName: camera.window.depthStencilName,
                });
            }

            this.buildCameraPass(camera, ppl, withinWindowIndex);
        }

        if (this.debugFramesRemaining > 0) {
            this.debugFramesRemaining--;
        }
    }

    private buildCameraPass(
        camera: renderer.scene.Camera,
        ppl: rendering.BasicPipeline,
        withinWindowIndex: number,
    ): void {
        const window = camera.window;
        const width = Math.max(Math.floor(window.width), 1);
        const height = Math.max(Math.floor(window.height), 1);

        // Camera viewport được engine lưu ở dạng normalized rect.
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

        // Mặc định phản ánh clear flags của Camera trong Inspector.
        let colorLoad = (camera.clearFlag & gfx.ClearFlagBit.COLOR)
            ? gfx.LoadOp.CLEAR
            : gfx.LoadOp.LOAD;

        let depthClearBits = camera.clearFlag & gfx.ClearFlagBit.DEPTH_STENCIL;
        let depthLoad = depthClearBits
            ? gfx.LoadOp.CLEAR
            : gfx.LoadOp.LOAD;

        // Chỉ can thiệp từ camera thứ 2 dùng CÙNG Color RenderWindow.
        // Đây là thí nghiệm; khi làm sản phẩm thật nên để camera flags rõ ràng.
        if (withinWindowIndex > 0) {
            switch (EXPERIMENT) {
                case 'FORCE_LATER_COLOR_CLEAR':
                    colorLoad = gfx.LoadOp.CLEAR;
                    break;
                case 'FORCE_LATER_COLOR_LOAD':
                    colorLoad = gfx.LoadOp.LOAD;
                    break;
                case 'FORCE_LATER_DEPTH_LOAD':
                    depthLoad = gfx.LoadOp.LOAD;
                    depthClearBits = 0;
                    break;
                case 'FORCE_LATER_DEPTH_CLEAR':
                    depthLoad = gfx.LoadOp.CLEAR;
                    depthClearBits = gfx.ClearFlagBit.DEPTH_STENCIL;
                    break;
            }
        }

        // Color: STORE vì pass sau có thể cần giữ kết quả.
        pass.addRenderTarget(
            window.colorName,
            colorLoad,
            gfx.StoreOp.STORE,
            this.clearColor,
        );

        // Depth: STORE cho bài học giữ depth giữa hai camera.
        // Sản phẩm thật có thể DISCARD nếu không còn pass nào dùng depth.
        if (depthLoad === gfx.LoadOp.CLEAR) {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.CLEAR,
                gfx.StoreOp.STORE,
                camera.clearDepth,
                camera.clearStencil,
                depthClearBits,
            );
        } else {
            pass.addDepthStencil(
                window.depthStencilName,
                gfx.LoadOp.LOAD,
                gfx.StoreOp.STORE,
            );
        }

        // Các queue tương tự Bài 2: vẫn phân nhóm nội dung Scene.
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

// Đăng ký lúc module được import, không đặt trong start().
if (rendering) {
    rendering.setCustomPipeline('LearnCRP', new LearnCRPPipeline());
}

// Gắn component này lên node CRPEntry để bảo đảm module được tham chiếu.
@ccclass('LearnCRPPipelineEntry')
export class LearnCRPPipelineEntry extends Component {}
```

### 5.1. Các điểm đáng chú ý trong code

1. `windowResize()` chỉ đăng ký resource; `setup()` dựng các pass mỗi frame.
2. `ppl.addRenderPass(width, height, 'default')`: mỗi Camera được cấp một pass raster riêng trong bài này.
3. `camera.window.colorName`: các camera có cùng RenderWindow dùng cùng color attachment, do đó thứ tự clear/load có ảnh hưởng trực tiếp.
4. `gfx.StoreOp.STORE` cho Depth khác với các ví dụ đơn camera có thể dùng `DISCARD`. Cần `STORE` nếu muốn camera sau `LOAD` depth từ pass trước.
5. `withinWindowIndex` là chỉ số **trong cùng một RenderWindow**, không phải Node index trong Hierarchy.
6. `debugFramesRemaining` chỉ log hai frame đầu để Console không bị ngập.
7. Không `sort()` lại cameras trong `setup()`.

### 5.2. Không nhầm API Engine Camera và component Camera

Trong `PipelineBuilder.setup`, camera là `renderer.scene.Camera`, khác với `Camera` component gắn lên node. Một số tên property khác nhau giữa hai lớp. Đoạn code dùng property của **renderer.scene.Camera** như trong tài liệu pipeline.

## 6. Thực hành 5 thí nghiệm theo thứ tự

Sau mỗi lần thay `EXPERIMENT`, lưu file, Preview lại, quan sát và chụp màn hình so sánh.

### Thí nghiệm 1 — Hai camera hoạt động đúng

```typescript
const EXPERIMENT: ClearExperiment = 'CAMERA_FLAGS';
```

Điều kiện: CameraWorld = `SOLID_COLOR`, CameraOverlay = `DEPTH_ONLY`.

Kỳ vọng: thấy cả `WorldCube` và `OverlayCube`. CameraOverlay không xóa color cũ vì Color được `LOAD`.

**Đọc Console:** `CameraWorld priority 0` trước `CameraOverlay priority 10`. Kiểm tra `colorName` của hai camera giống nhau; nếu khác, bạn không còn đang kiểm tra chung một RenderWindow.

### Thí nghiệm 2 — Vì sao Camera B xóa Camera A?

```typescript
const EXPERIMENT: ClearExperiment = 'FORCE_LATER_COLOR_CLEAR';
```

Kỳ vọng: render pass Camera B sẽ clear color attachment trước khi vẽ. `WorldCube` có thể biến mất (bị thay bằng màu clear của Camera B), chỉ còn overlay.

Giải thích: queue của Camera A vẫn đã render; cái bị xóa là pixel của attachment khi mở pass B.

### Thí nghiệm 3 — Giữ color không có nghĩa giữ depth

```typescript
const EXPERIMENT: ClearExperiment = 'FORCE_LATER_COLOR_LOAD';
```

Kỳ vọng: color của Camera A được giữ. Depth vẫn theo `Camera.clearFlag` (trong setup này CameraOverlay = `DEPTH_ONLY` nên depth bị clear).

### Thí nghiệm 4 — Thử giữ Depth của Camera A

```typescript
const EXPERIMENT: ClearExperiment = 'FORCE_LATER_DEPTH_LOAD';
```

Đưa hai Cube chồng nhau trên màn hình, bảo đảm camera cùng hướng, projection/far/near tương thích rồi di chuyển `OverlayCube` ra trước và ra sau.

Kỳ vọng: nếu depth cũ được bảo toàn và depth test của material bật, `OverlayCube` phía sau có thể bị che bởi depth của `WorldCube`, ngay cả khi CameraOverlay chỉ nhìn layer UI_3D.

**Đây là thí nghiệm, không nên suy luận rằng depth giữa hai Camera luôn dùng chung đúng nghĩa thế giới**: nếu camera khác phép chiếu hoặc hệ tọa độ depth, kết quả so sánh có thể không hợp lệ. Một số backend còn có ràng buộc riêng về depth attachment.

### Thí nghiệm 5 — Xóa Depth cho overlay

```typescript
const EXPERIMENT: ClearExperiment = 'FORCE_LATER_DEPTH_CLEAR';
```

Kỳ vọng: overlay không bị depth cũ cản. Color không đổi theo chế độ này; vẫn lấy từ `camera.clearFlag`.

**Tổng hợp:**

| Thí nghiệm | Color của Camera B | Depth của Camera B | Hiện tượng cần quan sát |
|---|---|---|---|
| `CAMERA_FLAGS` | Theo Inspector | Theo Inspector | Hai camera chồng đúng |
| `FORCE_LATER_COLOR_CLEAR` | `CLEAR` | Theo Inspector | Hình Camera A bị xóa |
| `FORCE_LATER_COLOR_LOAD` | `LOAD` | Theo Inspector | Giữ hình Camera A |
| `FORCE_LATER_DEPTH_LOAD` | Theo Inspector | `LOAD` | Có thể bị depth cũ che |
| `FORCE_LATER_DEPTH_CLEAR` | Theo Inspector | `CLEAR` | Depth mới cho Camera B |

## 7. Viewport và Camera.rect

### 7.1. Từ normalized rect sang pixel

Giả sử cửa sổ render 1280 × 720 và camera viewport là:

```text
x=0.5, y=0, width=0.5, height=1
```

Thì:

```text
left   = round(0.5 × 1280) = 640
width  = round(0.5 × 1280) = 640
top    = round(0 × 720)    = 0
height = round(1 × 720)    = 720
```

`pass.setViewport()` nhận kích thước pixel. Trong code sử dụng `camera.viewport.width` và `.height`, không thay chúng bằng `.z` / `.w` vì tài liệu Cocos cảnh báo có sự khác biệt Web/Native.

### 7.2. Mini-map: vấn đề CLEAR ngoài viewport

Không nên hiểu:

```typescript
pass.setViewport(halfScreen);
pass.addRenderTarget(name, gfx.LoadOp.CLEAR, gfx.StoreOp.STORE, color);
```

là “chỉ clear nửa màn hình”. `LoadOp.CLEAR` áp dụng cho **attachment** ở đầu pass. `Viewport` chủ yếu giới hạn vùng rasterization, không phải phạm vi clear attachment.

Để làm mini-map/split-screen an toàn trong pipeline production, thường phải cân nhắc việc vẽ vào **RenderTexture riêng** rồi composite, hoặc cơ chế clear theo vùng thực sự được backend hỗ trợ. Đây sẽ là nội dung mở rộng sau khi học RenderTarget trung gian ở Bài 4.

### 7.3. Lỗi đặc thù Cocos Creator 3.8.8

Cocos engine có issue **#19108 — “3.8.8 Breaks `camera.setViewportInOrientedSpace` with multiple cameras in one scene”**: người báo lỗi thấy chỉnh viewport một camera gây ảnh hưởng hình ảnh camera khác. Tại thời điểm đối chiếu, issue vẫn đang mở.

Vì vậy:

1. Trước tiên kiểm chứng **hai camera đều fullscreen `(0,0,1,1)`**.
2. Mới thử Rect nửa màn hình.
3. Nếu hai camera xung đột viewport trên 3.8.8, đừng khẳng định code pipeline sai ngay; so sánh trên `Builtin` và xem issue #19108.
4. Không khuyên gọi `camera.setViewportInOrientedSpace()` làm giải pháp mặc định cho bài này.

## 8. ClearFlags: những chế độ quan trọng

Cách đặt trong Inspector (tên hiển thị có thể khác chút tùy Editor):

| Camera.ClearFlags | Nguyên tắc dùng |
|---|---|
| `SOLID_COLOR` | Camera nền/đầu tiên, muốn bắt đầu bằng một màu rõ ràng |
| `DEPTH_ONLY` | Camera overlay: giữ Color, reset Depth |
| `DONT_CLEAR` | Giữ cả Color lẫn Depth; phải có nội dung trước hợp lệ |
| `SKYBOX` | Cần đường render Skybox phù hợp; pipeline tối giản Bài 3 **không có pass Skybox** |

**Không dùng `SKYBOX` làm kiểm chứng đầu tiên**: custom pipeline đang học chưa vẽ skybox, nên có thể xuất hiện nền không đúng. Ngoài ra `DONT_CLEAR` cho camera đầu tiên có thể đọc buffer chưa khởi tạo/không xác định.

## 9. Lỗi thường gặp và cách kiểm tra

| Triệu chứng | Nguyên nhân có thể | Cách kiểm tra |
|---|---|---|
| Chỉ thấy Camera B | Camera B color `CLEAR` | Chuyển Camera B về `DEPTH_ONLY` hoặc Color `LOAD` |
| Không thấy OverlayCube | Layer/Visibility sai, camera không nhìn thấy object, material | Xem `Layer`, `Visibility`, vị trí, material unlit |
| OverlayCube bị che vô lý | Đang `LOAD` Depth cũ | Thử `FORCE_LATER_DEPTH_CLEAR` |
| Hình nhấp nháy / bẩn | Camera đầu tiên `DONT_CLEAR`; nội dung đầu frame chưa xác định | Camera nền dùng `SOLID_COLOR` |
| Đổi viewport một camera làm camera khác bị ảnh hưởng | Có thể liên quan bug 3.8.8 #19108 | So sánh Builtin và camera fullscreen |
| Hai camera không ảnh hưởng hình nhau | Có thể render ra hai `RenderWindow`/RenderTexture khác nhau | Log `camera.window.colorName` |
| WebGPU: UBO 18 > 12 | Layout shader/pipeline vượt giới hạn thiết bị | Phân lập với Builtin/WebGL2; lỗi không do ClearFlags trực tiếp |
| Gọi `setCustomPipeline()` nhưng chưa áp dụng | Module chưa load hoặc pipeline name sai | Kiểm tra `Using custom pipeline: LearnCRP` |

## 10. Bài tập tự làm

### Bài tập A — Dự đoán kết quả

CameraWorld vẽ Cube đỏ, CameraOverlay vẽ Cube xanh; cả hai cùng RenderWindow. CameraOverlay có `Color = CLEAR`, `Depth = CLEAR`.

- **Câu hỏi:** Cube đỏ mất do SceneFlags hay LoadOp?
- **Đáp án:** LoadOp.CLEAR ở color attachment của pass CameraOverlay.

### Bài tập B — Đổi Depth

Giữ Color của CameraWorld, thay chỉ Depth cho CameraOverlay và di chuyển Cube xanh từ trước ra sau Cube đỏ.

- **Yêu cầu:** Mô tả khác nhau giữa `LOAD` và `CLEAR` depth.
- **Gợi ý:** Phép chiếu phải tương thích thì mới giải thích “trước/sau” đúng được.

### Bài tập C — Dự đoán pixel vùng mini-map

CameraOverlay có viewport chỉ 25% màn hình, nhưng render pass dùng `LoadOp.CLEAR` Color.

- **Câu hỏi:** Có thể tin rằng 75% còn lại luôn giữ hình CameraWorld không?
- **Đáp án:** Không. Clear attachment không bị viewport giới hạn một cách bảo đảm.

### Bài tập D — Debug thứ tự Camera

Đổi `CameraWorld.priority = 100`, `CameraOverlay.priority = 0` và chạy lại.

- **Yêu cầu:** Xem log thứ tự `setup()`, giải thích tại sao “camera nền” chạy sau có thể phá lớp overlay.
- **Đáp án:** v3.8.8 sắp xếp tăng dần nên CameraOverlay chạy trước; CameraWorld chạy sau, clear màu lên hình đã có.

## 11. Checklist hoàn thành bài

- [ ] Hiểu `CLEAR`, `LOAD`, `STORE`, `DISCARD`.
- [ ] Dựng hai Camera cùng xuất vào một RenderWindow.
- [ ] Phân nhóm object bằng `Layer`/`Visibility`.
- [ ] Chạy `CAMERA_FLAGS` và thấy cả 2 Cube.
- [ ] Thử `FORCE_LATER_COLOR_CLEAR` và giải thích vì sao Cube cũ mất.
- [ ] Thử `FORCE_LATER_DEPTH_LOAD`/`CLEAR`.
- [ ] Phân biệt viewport của Camera với phạm vi clear attachment.
- [ ] Biết kiểm tra lỗi viewport nhiều Camera riêng của 3.8.8.

## 12. Tóm tắt

> **Camera thứ hai không tự động là một lớp trong suốt.** Nó tạo render pass mới: nếu color `CLEAR`, dữ liệu trước có thể bị xóa; nếu color `LOAD`, dữ liệu trước được giữ. Depth cần quyết định độc lập. Viewport chỉ quy định vùng rasterization, không bảo đảm clear chỉ xảy ra trong vùng đó.

**Bài 4 tiếp theo:** đăng ký `RenderTexture` trong `windowResize()`, vẽ Scene vào texture đó, rồi dùng một pass khác để xử lý/xuất texture ra màn hình — bước nền tảng của grayscale, blur và bloom.

---

## Tài liệu để đọc thêm (đã đối chiếu khi soạn)

1. Cocos Creator 3.8 — Writing a Customizable Render Pipeline:  
   https://docs.cocos.com/creator/3.8/manual/en/render-pipeline/write-render-pipeline.html
2. Cocos Creator 3.8 — Camera component (`ClearFlags`, `Rect`, `Visibility`):  
   https://docs.cocos.com/creator/3.8/manual/en/editor/components/camera-component.html
3. Cocos Creator 3.8 — Rendering Order (multi-camera clear recommendations):  
   https://docs.cocos.com/creator/3.8/manual/en/ui-system/components/engine/priority.html
4. **Đúng mã nguồn engine v3.8.8, `root.ts` dòng sort Camera:**  
   https://github.com/cocos/cocos-engine/blob/v3.8.8/cocos/root.ts
5. GitHub issue #19108 — viewport 2 camera ở 3.8.8:  
   https://github.com/cocos/cocos-engine/issues/19108

> Đây là tài liệu thực hành độc lập: chứa cả lý thuyết, hướng dẫn trong Editor, code TypeScript đầy đủ, thí nghiệm và checklist. Nếu code gặp lỗi phụ thuộc cấu hình project, dùng log và bảng troubleshooting để phân lập nguyên nhân trước khi chỉnh sửa engine.
