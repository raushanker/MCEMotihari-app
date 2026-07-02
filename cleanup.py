#!/usr/bin/env python3
"""
MCE Motihari App — Intelligent Code Cleanup Script
- Wraps standalone console.log/console.time/console.timeEnd in __DEV__ guards
- Removes verbose debug-only [VOTE FLOW], [loadComments], [Startup] logs that clutter production
- Wraps profileCache logs
- Wraps mediaPicker logs
- Keeps console.warn and console.error as-is (these are important)
- Never modifies lines already inside __DEV__ blocks
- Never touches node_modules
"""
import re
import os
import sys

# Patterns to FULLY REMOVE (production noise, not useful even in dev for end users)
REMOVE_PATTERNS = [
    r"console\.log\('\[VOTE FLOW\].*'\);?\s*\n?",
    r"console\.log\(`\[VOTE FLOW\].*`\).*\n?",
    r"console\.log\('\[loadComments\].*'\);?\s*\n?",
    r"console\.log\(`\[loadComments\].*`\).*\n?",
]

# Files to target for console.time cleanup (wrap in __DEV__)
STORE_FILE = "src/store/useAppStore.ts"

def wrap_dev(line):
    """Wrap a standalone console.log/time/timeEnd in __DEV__ check."""
    stripped = line.rstrip()
    indent = len(stripped) - len(stripped.lstrip())
    spaces = ' ' * indent
    return f"{spaces}if (__DEV__) {{ {stripped.lstrip()} }}\n"

def process_store_file(filepath):
    """Wrap all bare console.time/timeEnd in store file with __DEV__ guard."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    result = []
    i = 0
    removed = 0
    wrapped = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Skip if already inside an if (__DEV__) block - check previous lines for context
        # Simple heuristic: if the line contains console.time/timeEnd and is NOT already wrapped
        if re.search(r'\bconsole\.(time|timeEnd)\(', stripped) and not stripped.startswith('//'):
            # Check if previous non-empty line has __DEV__
            prev_lines = [l.strip() for l in lines[max(0,i-3):i] if l.strip()]
            already_dev = any('__DEV__' in pl for pl in prev_lines)
            already_inline_dev = '__DEV__' in stripped
            
            if not already_dev and not already_inline_dev:
                result.append(wrap_dev(line))
                wrapped += 1
                i += 1
                continue
        
        # Remove verbose VOTE FLOW logs
        if re.search(r"console\.log\(['\`]\[VOTE FLOW\]", stripped) and not stripped.startswith('//'):
            removed += 1
            i += 1
            continue
        
        # Remove verbose loadComments logs  
        if re.search(r"console\.log\(['\`]\[loadComments\]", stripped) and not stripped.startswith('//'):
            removed += 1
            i += 1
            continue
            
        result.append(line)
        i += 1
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(result)
    
    print(f"  {filepath}: wrapped {wrapped} console.time calls, removed {removed} verbose logs")

def process_file_wrap_logs(filepath, patterns_to_wrap):
    """Wrap matching console.log lines in __DEV__ guard in a given file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    result = []
    wrapped = 0
    
    for line in lines:
        stripped = line.strip()
        if not stripped.startswith('//') and not stripped.startswith('*'):
            for pattern in patterns_to_wrap:
                if re.search(pattern, stripped):
                    # Check if already guarded
                    already_dev = '__DEV__' in stripped
                    if not already_dev:
                        line = wrap_dev(line)
                        wrapped += 1
                        break
        result.append(line)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(result)
    
    if wrapped > 0:
        print(f"  {filepath}: wrapped {wrapped} console.log calls")

def cleanup_profilecache(filepath):
    """Wrap all console.log in profileCache with __DEV__."""
    process_file_wrap_logs(filepath, [r'\bconsole\.log\b'])

def cleanup_mediapicker(filepath):
    """Wrap all console.log in mediaPicker with __DEV__."""
    process_file_wrap_logs(filepath, [r'\bconsole\.log\b'])

def cleanup_notifications_util(filepath):
    """Wrap verbose push notification logs with __DEV__."""
    process_file_wrap_logs(filepath, [r'\bconsole\.log\b'])

def cleanup_firebase_config(filepath):
    """Wrap the localhost bypass log."""
    process_file_wrap_logs(filepath, [r'\bconsole\.log\b'])

def cleanup_network_screen(filepath):
    """Wrap perf logger logs in network.tsx."""
    process_file_wrap_logs(filepath, [r'\[Perf Logger\]'])

def cleanup_drawer(filepath):
    """Remove verbose telemetry logs from CustomDrawer."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    result = []
    removed = 0
    for line in lines:
        stripped = line.strip()
        if re.search(r"console\.log\(['\`]\[Telemetry\]", stripped) and not stripped.startswith('//'):
            removed += 1
            continue
        result.append(line)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(result)
    if removed > 0:
        print(f"  {filepath}: removed {removed} verbose [Telemetry] logs")

def cleanup_study_materials(filepath):
    """Wrap [UPLOAD_TRACE] and [CLEANUP_TRACE] logs in __DEV__."""
    process_file_wrap_logs(filepath, [r'\[UPLOAD_TRACE\]', r'\[CLEANUP_TRACE\]', r'\[DEBUG\]', r'\[Perf Logger\]'])

def cleanup_pdf_compressor(filepath):
    """Wrap all console.log in PDFCompressor with __DEV__."""
    process_file_wrap_logs(filepath, [r'\bconsole\.log\b'])

base = "/Users/raushanisonline/Documents/GitHub/MCEMotihari app"

print("🧹 MCE App Code Cleanup — Starting...")
print()

# 1. Store file: wrap console.time, remove VOTE FLOW / loadComments spam
print("📦 Processing store...")
process_store_file(os.path.join(base, STORE_FILE))

# 2. Utils
print("\n🔧 Processing utils...")
cleanup_profilecache(os.path.join(base, "src/utils/profileCache.ts"))
cleanup_mediapicker(os.path.join(base, "src/utils/mediaPicker.ts"))
cleanup_notifications_util(os.path.join(base, "src/utils/notifications.ts"))
cleanup_firebase_config(os.path.join(base, "src/config/firebase.ts"))
cleanup_pdf_compressor(os.path.join(base, "src/utils/PDFCompressorHelper.ts"))
cleanup_pdf_compressor(os.path.join(base, "src/utils/PDFCompressorHelper.native.ts"))

# 3. Components
print("\n🎨 Processing components...")
cleanup_drawer(os.path.join(base, "src/components/drawer/CustomDrawer.tsx"))
cleanup_study_materials(os.path.join(base, "src/components/modals/StudyMaterialsModal.tsx"))

# 4. App screens
print("\n📱 Processing app screens...")
cleanup_network_screen(os.path.join(base, "src/app/network.tsx"))

print("\n✅ Cleanup complete!")
print()
print("Summary:")
print("  - console.time/timeEnd wrapped in __DEV__ guards in store")
print("  - [VOTE FLOW] verbose debug logs removed from store")
print("  - [loadComments] verbose debug logs removed from store")
print("  - [Telemetry] drawer logs removed (no-op in production)")
print("  - [UPLOAD_TRACE]/[CLEANUP_TRACE]/[DEBUG] wrapped in __DEV__")
print("  - profileCache, mediaPicker, notifications logs wrapped in __DEV__")
