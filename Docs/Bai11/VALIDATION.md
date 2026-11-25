# Validation – Bài 11

## Phạm vi đã kiểm tra

1. Cú pháp/type/import nội bộ TypeScript bằng `tsc --noEmit --strict` với mock khai báo `cc` rút gọn (không phải engine type declarations thật).
2. Các Shader Pass của `Lesson11HDRBloom.effect`: **7**; `Lesson11ToneMap.effect`: **1**. Không vượt giới hạn 8 pass trên một Material.
3. Tên layout `lesson11-*`, sampler `inputTexture`/`detailTexture`/`bloomTexture`, uniforms và chỉ số Shader Pass theo code.
4. Test harness RenderGraph mô phỏng: 2 Camera BEFORE_BLOOM (World/Overlay) + 1 UI AFTER_TONEMAP trên Window 0 và 1 Camera direct trên Window 1.
5. `World -> SharedSceneColor` color `CLEAR`; `Overlay -> SharedSceneColor` color `LOAD`; `ToneMap -> Window0Color`; `UI -> Window0Color` color `LOAD`.
6. Pass count từ harness: Window 0 = **11**, Window 1 = **1**, tổng = 12; Bloom Prefilter xuất hiện **một lần** cho Window 0.
7. PNG được render từ hai SVG vector bằng Graphviz và CairoSVG; ZIP đã kiểm tra toàn vẹn.

## Chưa xác minh

- Engine 3.8.8_Custom thực tế có compile cả hai Effect không.
- HDR16F Linear Filtering ở backend WebGL2 không báo LINEAR_FILTER.
- Profile thời gian GPU/VRAM, shader quality, MSAA, depth giữa projection khác nhau.
- Lập lịch dependency giữa hai RenderWindow khi RenderTexture từ Window 1 được sample trực tiếp trong UI Window 0 trong cùng frame.

## Những giả định quan trọng

- Window 0 có World, Overlay, UI; World và Overlay dùng `BEFORE_BLOOM`, UI dùng `AFTER_TONEMAP`.
- Camera Controller thuộc cùng Window và là Camera `BEFORE_BLOOM`.
- Camera Output `window.colorName` là surface LDR và tương thích với khai báo `RGBA8`.
- Các vật thể trước Bloom xử lý depth và alpha theo Material của từng mesh.
