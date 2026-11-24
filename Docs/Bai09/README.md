# Bài 9 - Bloom Multi-pass trong Cocos Creator 3.8.8

1. Giải nén vào `assets/Lesson9/` với 8 file TypeScript và `Lesson9Bloom.effect`.
2. Tắt module Bài 8/Bài cũ đang gọi `rendering.setCustomPipeline('LearnCRP', ...)`.
3. Tạo Material từ Lesson9Bloom.effect, gắn Lesson9CameraSettings trên Camera và kéo Material vào bloomMaterial.
4. Camera World: enableBloom ON; Camera Overlay: transparentBackground ON, compositeWithAlpha ON và Clear Color OFF.
5. Bật Custom Pipeline `LearnCRP`, Play, xem `[Lesson9:Resize]` và `[Lesson9:Route]`.

Tài liệu chi tiết: `Cocos_3.8.8_CRP_Bai_09_Bloom_MultiPass.md`.
Sơ đồ có cả PNG và SVG.

Lưu ý: Bloom của bài này ở LDR RGBA8, blur Gaussian 1/4 và chưa chạy thử với engine custom thực tế. Vui lòng kiểm tra shader compile trong Editor.
