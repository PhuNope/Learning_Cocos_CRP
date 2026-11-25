# Kiểm tra tĩnh Bài 10

- `tsc --noEmit` với declaration mock tương thích các API Cocos 3.8 dùng trong lesson: **PASS**. Không thay thế typecheck với `cc` thật từ `3.8.8_Custom`.
- `CCEffect` được parse YAML: **9 Shader Pass**, tên `pass:` khớp từng `ppl.addRenderPass(..., name)` trong TypeScript.
- Với 9 passes: index 0 Boost; 1 Prefilter; 2 Downsample; 3 BlurH; 4 BlurV; 5 Upsample; 6 Combine; 7 TonemapOpaque; 8 TonemapAlpha.
- Có 9 TypeScript files, mọi relative imports trỏ tới file tồn tại.
- Các sơ đồ SVG render sang PNG bằng CairoSVG, kiểm tra trực quan.
- **Chưa thể kiểm chứng** biên dịch Effect trong Editor hoặc kết quả RenderGraph trên GPU của engine custom.

## Những lỗi runtime cần log nếu xuất hiện

1. `[Lesson10:Format]` cho biết dùng `RGBA16F` hay `RGBA8 fallback`.
2. `Invalid render pass`: so tên `pass:` trong `.effect` với `ppl.addRenderPass(...)`.
3. `Could not find texture`: xem `windowResize()`, `containsResource`, và tên resource theo UUID.
4. Preview bị đen: kiểm tra Material đang dùng đúng `Lesson10HDRBloom.effect`, không dùng Material Bài 9.
5. Overlay che World: `transparentBackground=true`, `compositeWithAlpha=true`, Camera Overlay không CLEAR COLOR.
6. Màu quá sáng: thử `diagnosticGain=1`, `manualSRGB=false`, giảm `exposure`.
