#!/usr/bin/env python3
"""
更新 GAS 中板塊追蹤的 driveUrl
刪除舊記錄 → 重新加入（帶正確 driveUrl）
"""
import urllib.parse
import subprocess
import datetime

BASE = 'https://script.google.com/macros/s/AKfycbw_UeOLvsktIsdYEAHG2fJ2JxktsmdORGtnkEn4leyamj7fD602djoFexgrNNiCUDMv/exec'

# 需要更新的記錄：ID + 正確的 driveUrl
records = [
    {
        'old_id': 'WB_1781001632597',
        'title': '📊 板塊追蹤 - 6月6日',
        'driveUrl': 'https://dash.vigoradv.com/news/2026-06-06_Stock_Tracking.html',
        'notes': '美股板塊追蹤 · 富途/老虎/AI/動漫'
    },
    {
        'old_id': 'WB_1781001635833',
        'title': '📊 板塊追蹤 - 6月7日',
        'driveUrl': 'https://dash.vigoradv.com/news/2026-06-07_Stock_Tracking.html',
        'notes': '美股板塊追蹤 · 富途/老虎/AI/動漫'
    },
    {
        'old_id': 'WB_1781001638503',
        'title': '📊 板塊追蹤 - 6月8日',
        'driveUrl': 'https://dash.vigoradv.com/news/2026-06-08_Stock_Tracking.html',
        'notes': '美股板塊追蹤 · 富途/老虎/AI/動漫'
    },
    {
        'old_id': 'WB_1781001641936',
        'title': '📊 板塊追蹤 - 6月9日',
        'driveUrl': 'https://dash.vigoradv.com/news/2026-06-09_Stock_Tracking.html',
        'notes': '美股板塊追蹤 · 富途/老虎/AI/動漫'
    },
    {
        'old_id': 'WB_1781158434436',
        'title': '📊 板塊追蹤 - 6月11日',
        'driveUrl': 'https://dash.vigoradv.com/news/2026-06-11_Stock_Tracking.html',
        'notes': '富途FUTU$92.93 PE10.27 6/12關稅前最後交易日 19分析師買入目標$167；老虎TIGR$4.83逼近$4.00生死線 Put異常活躍；明日6/12三家同步暫停境內買入 最後已知利空落地；下個催化劑：Q2業績(8月)首次反映關稅衝擊'
    },
]

for rec in records:
    old_id = rec['old_id']
    title = rec['title']
    driveUrl = rec['driveUrl']
    notes = rec['notes']
    
    print(f'處理: {title}')
    
    # 1. 刪除舊記錄
    params_del = urllib.parse.urlencode({
        'action': 'delete',
        'id': old_id
    })
    r_del = subprocess.run(['curl', '-s', '-L', BASE + '?' + params_del], 
                        capture_output=True, text=True)
    print(f'  刪除: {r_del.stdout.strip()[:80]}')
    
    # 2. 重新加入（帶正確 driveUrl）
    params_add = urllib.parse.urlencode({
        'action': 'add',
        'type': '美股追蹤',
        'title': title,
        'driveUrl': driveUrl,
        'status': '已確認',
        'notes': notes
    })
    r_add = subprocess.run(['curl', '-s', '-L', BASE + '?' + params_add], 
                        capture_output=True, text=True)
    print(f'  重新加入: {r_add.stdout.strip()[:80]}')
    print()

print('完成！')
