# Cocos Creator 3.8.8 — Bài 8

**Modular RenderPass Builders + 2-stage PostFX Chain**

1. Giải nén, copy **9 file `Lesson8*`** vào cùng thư mục `assets/lessons/lesson08/`.
2. Dừng/bỏ đăng ký pipeline `LearnCRP` của các bài cũ.
3. Tạo Material từ `Lesson8ColorFX.effect`, gắn vào `Lesson8CameraSettings` của từng Camera.
4. Bật tùy chọn `enableSecondFX` để nối 2 hiệu ứng.
5. Với Overlay trên cùng Window: `transparentBackground=true`, `compositeWithAlpha=true`, **Clear Color OFF**.
6. Cấu hình Project Settings > Graphics Settings > Render Pipeline (New) = `LearnCRP`.
7. Đọc Markdown và xem 3 SVG đi kèm.

**Files:** 8 `.ts` + 1 `.effect` + 1 `.md` + 3 `.svg` + 3 `.png` + README.

**Lưu ý:** mẫu được thiết kế theo API chính thức Cocos 3.8, chưa kiểm thử runtime trên custom engine của bạn.
