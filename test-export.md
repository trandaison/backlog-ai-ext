# Test Export selectedModels

## Cách test:

1. **Load extension vào Chrome:**
   - Mở chrome://extensions/
   - Enable Developer mode
   - Load unpacked: `/Users/nals_macbook/workspace/internal/backlog-ai-ext/dev-build`

2. **Chọn models:**
   - Click extension icon → Options
   - Vào tab "AI Models"
   - **Uncheck tất cả models**
   - **Chỉ check 5 models cụ thể**

3. **Test export:**
   - Vào tab "Export/Import"
   - Check "Export configurations"
   - Click "Export Data"
   - Mở F12 Console để xem debug logs

## Expected logs:
```
🔍 [Export] Selected models to export: ["model1", "model2", "model3", "model4", "model5"]
🔍 [Export] Total selected models count: 5
🔍 [Export] Storage selectedModels: ["model1", "model2", "model3", "model4", "model5"]
```

## Kiểm tra file export:
- Mở file JSON được download
- Tìm `configs.aiModels.selectedModels`
- Phải chỉ có 5 models đã chọn

## Changes made:
1. ✅ Sử dụng `selectedModels` state từ UI thay vì storage
2. ✅ Chỉ get specific config keys thay vì toàn bộ sync storage
3. ✅ Thêm debug logs để verify data
4. ✅ Cải thiện UI với separate blocks cho Export/Import
