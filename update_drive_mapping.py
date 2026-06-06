#!/usr/bin/env python3
"""
update_drive_mapping.py
自動更新 drive_mapping.json（供 dashboard_live.html fixDriveUrl() 使用）

用法：
  python3 update_drive_mapping.py <gdrive_file_id> <github_pages_path> [drive_mapping.json路徑]

範例：
  python3 update_drive_mapping.py 1eMNDXZipS7VPJGQ4JTWprTQr7BQ-Yb8l stock_report_20260606.html
  python3 update_drive_mapping.py 1ABC123 promo/EventEasy_Option_0606_A.png

GitHub Pages 完整網址會是：
  https://eventeasynet.github.io/workbuddyClaw/<github_pages_path>
"""

import sys
import os
import json
from datetime import datetime, timezone, timedelta

HK_TZ = timezone(timedelta(hours=8))

def update_mapping(gdrive_id, gh_pages_path, mapping_path=None):
    if not mapping_path:
        mapping_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "drive_mapping.json")
    
    # 讀取現有映射
    if os.path.exists(mapping_path):
        with open(mapping_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"version": "1", "updatedAt": "", "mapping": {}}
    
    mapping = data.get("mapping", {})
    
    # 檢查是否已存在
    if gdrive_id in mapping:
        print(f"⚠️  映射已存在：{gdrive_id} → {mapping[gdrive_id]}")
        if mapping[gdrive_id] == gh_pages_path:
            print("   路徑相同，無需更新")
            return False
        print(f"   更新為：{gh_pages_path}")
    
    # 更新映射
    mapping[gdrive_id] = gh_pages_path
    data["mapping"] = mapping
    data["updatedAt"] = datetime.now(HK_TZ).isoformat()
    
    # 寫回檔案
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已更新映射：{gdrive_id} → {gh_pages_path}")
    print(f"📝 檔案：{mapping_path}")
    print(f"📊 共 {len(mapping)} 條映射")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法：python3 update_drive_mapping.py <gdrive_file_id> <github_pages_path> [mapping.json路徑]")
        sys.exit(1)
    
    gdrive_id = sys.argv[1]
    gh_pages_path = sys.argv[2]
    mapping_path = sys.argv[3] if len(sys.argv) > 3 else None
    
    update_mapping(gdrive_id, gh_pages_path, mapping_path)
