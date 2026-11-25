# Bài 11 – RenderGraph Per-Window Bloom

**Target:** Cocos Creator 3.8.8 / 3.8.8_Custom.

## Cài đặt nhanh

1. Copy 9 file `Lesson11*.ts` và 2 `.effect` vào `assets/Lesson11/`.
2. Gỡ/tắt module **Lesson10PipelineBuilder** đang đăng ký `LearnCRP`.
3. Tạo Material `M_L11_HDRBloom` từ `Lesson11HDRBloom.effect` và `M_L11_ToneMap` từ `Lesson11ToneMap.effect`.
4. Main Camera: gắn `Lesson11CameraSettings`, chọn `BEFORE_BLOOM`, bật `Is Window Controller`, gán 2 Material, bật Window Post và Bloom.
5. OverlayCamera: gắn `Lesson11CameraSettings`, chọn `BEFORE_BLOOM`, tắt `Is Window Controller`, bật `Clear Depth Before Scene` nếu cần.
6. Camera UI: không gắn settings hoặc đặt `AFTER_TONEMAP`.
7. Play và xem `[Lesson11:WindowRoute]`: `bloomChains: 1` cho Window có Main+Overlay.

## Cấu trúc

- `Lesson11PipelineBuilder.ts`: nhóm Camera theo RenderWindow và điều phối pass.
- `Lesson11ResourceRegistry.ts`: đăng ký resource **một bộ tên chung mỗi Window**, format nhất quán.
- `Lesson11ScenePassBuilder.ts`: Scene pass sử dụng CLEAR/LOAD/STORE hợp lý.
- `Lesson11HDRBoostPassBuilder.ts`, `Lesson11BloomPassBuilder.ts`: radiance và 6 Bloom pass.
- `Lesson11ToneMapPassBuilder.ts`: ToneMap một lần vào Window.
- `Lesson11HDRBloom.effect`: **7 Shader Pass**.
- `Lesson11ToneMap.effect`: **1 Shader Pass**.

## Lưu ý quan trọng

- **Không cần** `transparentBackground` + `compositeWithAlpha` như Bài 10, vì World và Overlay ghi chung vào SceneColor.
- Bản demo luôn dùng `LOAD` màu từ Camera BEFORE_BLOOM thứ hai trở đi, và Camera AFTER_TONEMAP sau ToneMap.
- GPU WebGL2 có `RGBA16F canRender=true`, `canSample=true`, `canLinearFilter=false`: code mặc định **fallback RGBA8** để tránh phụ thuộc linear filtering chưa được báo hỗ trợ. Xem tài liệu Markdown để biết tùy chọn thử nghiệm.
- Bài này **chưa** sắp xếp dependency liên Window khi một RenderTexture được UI Window khác dùng trong cùng frame.
- Cú pháp TypeScript và luồng API đã kiểm tra tĩnh/giả lập; Effect và kết quả GPU cần test trong Creator thực tế.

Đọc giáo trình `Cocos_3.8.8_CRP_Bai_11_Optimized_RenderGraph_PerWindow_Bloom.md` để hiểu các thử nghiệm.
