Cocos Creator 3.8.8 – BÀI 7: PipelineConfig / CameraConfig / PipelineBuilder
=====================================================================
1. Chép 4 file .ts và Lesson7ColorFX.effect vào CÙNG một thư mục assets.
2. Chỉ Lesson7PipelineBuilder.ts đăng ký rendering.setCustomPipeline('LearnCRP', ...).
   Không giữ các bản Bài 4/5/6 cùng đăng ký tên LearnCRP.
3. Gỡ Lesson6CameraSettings trên camera; thêm Lesson7CameraSettings.
4. Tạo Material từ Lesson7ColorFX.effect và gán vào từng Lesson7CameraSettings.
5. World: TransparentBackground OFF, CompositeWithAlpha OFF.
6. Overlay: TransparentBackground ON, CompositeWithAlpha ON; Camera Clear Flags không CLEAR COLOR.
7. Camera thứ ba có thể gán RenderTexture ở Camera Target Texture để tạo RenderWindow khác.
8. Đọc file .md và 2 sơ đồ SVG để hiểu luồng và các hạn chế của ví dụ.

Đã kiểm tra cú pháp TS, tên pass, cấu trúc file và SVG, chưa thử chạy engine 3.8.8_Custom.
