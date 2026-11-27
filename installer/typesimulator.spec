# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for TypeSimulator v2 standalone Windows desktop bundle."""

from pathlib import Path
from PyInstaller.utils.hooks import collect_all

ROOT = Path(SPECPATH).resolve().parent
FRONTEND_DIST = ROOT / "frontend" / "dist"
ICON_PATH = ROOT / "installer" / "assets" / "icon.ico"

if not FRONTEND_DIST.exists():
    raise FileNotFoundError(
        f"Missing {FRONTEND_DIST}. Build the desktop frontend first with 'npm run build:desktop'."
    )

wv_datas, wv_binaries, wv_hidden = collect_all("webview")
pn_datas, pn_binaries, pn_hidden = collect_all("pythonnet")
cl_datas, cl_binaries, cl_hidden = collect_all("clr_loader")

datas = [
    (str(FRONTEND_DIST), "frontend/dist"),
    (str(ICON_PATH), "installer/assets"),
    *wv_datas,
    *pn_datas,
    *cl_datas,
]

binaries = [
    *wv_binaries,
    *pn_binaries,
    *cl_binaries,
]

hiddenimports = [
    "pynput.keyboard._win32",
    "pynput.mouse._win32",
    "webview.platforms.edgechromium",
    "webview.platforms.winforms",
    "clr",
    *wv_hidden,
    *pn_hidden,
    *cl_hidden,
]

a = Analysis(
    [str(ROOT / "backend" / "desktop_app.py")],
    pathex=[str(ROOT)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "customtkinter", "pytest", "PIL"],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="TypeSimulator",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    icon=str(ICON_PATH) if ICON_PATH.exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="TypeSimulator",
)
