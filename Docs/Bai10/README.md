# Lesson10 — HDR + Tone Mapping + Color Space (Cocos Creator 3.8.8)

## Các file

- 9 file TypeScript `Lesson10*.ts`: camera settings, types, config, registry và các pass builder.
- `Lesson10HDRBloom.effect`: 9 shader passes, index **0...8**.
- `Cocos_3.8.8_CRP_Bai_10_HDR_ToneMapping_ColorSpace.md`: giáo trình chi tiết.
- `Bai10_HDR_RenderGraph.svg/png`, `Bai10_HDR_LDR_ColorFlow.svg/png`: sơ đồ vector và ảnh xem trước.

## Khởi động

1. Chép các file `Lesson10*.ts` và `Lesson10HDRBloom.effect` vào **cùng một folder** trong `assets`.
2. Vô hiệu hóa đăng ký `LearnCRP` của Bài 1–9 (chỉ một builder đăng ký).
3. Tạo Material từ `Lesson10HDRBloom.effect`.
4. Gắn `Lesson10CameraSettings` lên Camera World và Overlay, gán Material ở `postMaterial`.
5. Xem `Lesson10:Format`, `Lesson10:Resize`, `Lesson10:Route` ở Console.

## Lưu ý quan trọng

- RGBA16F chỉ khi GPU/backend hỗ trợ; không hỗ trợ thì fallback RGBA8.
- `diagnosticGain > 1` **chỉ để trình diễn** HDR values; không phải cấu hình ánh sáng HDR thật.
- RenderWindow vẫn RGBA8; ToneMap là bước cuối.
- Overlay: transparentBackground=true, compositeWithAlpha=true, Camera Clear Color OFF.
- Tắt `manualSRGB` mặc định, vì gamma backend khác nhau.
- Không dùng Material của Lesson9: index và pass names khác.

Chưa kiểm thử runtime với engine custom trên máy của bạn.
