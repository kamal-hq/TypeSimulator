# Third-Party Notices

TypeSimulator is licensed under the MIT License (see `LICENSE`). It incorporates or bundles the following open-source third-party components, each subject to its own license terms.

---

## Python Desktop Runtime Dependencies

### pynput (`>=1.7.7`, bundled `1.8.2`)
- **License:** GNU Lesser General Public License v3.0 (LGPL-3.0)
- **Source & License Text:** https://github.com/moses-palmer/pynput
- **Notice:** TypeSimulator uses `pynput` for OS-level keystroke injection and global hotkey registration. Under the LGPL-3.0, you are entitled to obtain the source code of `pynput` from the upstream repository above (or on request via `muhammad.kamal.hq@gmail.com`) and to replace or relink `pynput` when building TypeSimulator from source (`https://github.com/kamal-hq/TypeSimulator`).

### pywebview (`>=5.1`, bundled `6.2.1`)
- **License:** BSD 3-Clause License
- **Source:** https://github.com/r0x0r/pywebview
- **Notice:**
  > Copyright (c) 2014–2017, Roman Sirokov and contributors. All rights reserved.
  > Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met: redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer; redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution; neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission. THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.

### Transitive Python Desktop Dependencies
- **pythonnet** (`3.2.1`) — MIT License — https://github.com/pythonnet/pythonnet
- **clr-loader** (`0.3.1`) — MIT License — https://github.com/pythonnet/clr-loader
- **cffi** (`2.1.1`) — MIT License — https://github.com/python-cffi/cffi
- **pycparser** (`3.0`) — BSD 3-Clause License — https://github.com/eliben/pycparser
- **bottle** (`0.13.4`) — MIT License — https://github.com/bottlepy/bottle
- **proxy-tools** (`0.1.0`) — MIT License — https://github.com/jtushman/proxy_tools
- **typing-extensions** (`4.15.0`) — PSF-2.0 License — https://github.com/python/typing_extensions
- **Microsoft Edge WebView2 Loader** (redistributed via `pywebview`) — Microsoft Edge WebView2 SDK Redistributable Terms

---

## Frontend Runtime Dependencies & Self-Hosted Fonts

- **React & React DOM** (`^19.0.0`) — MIT License — https://github.com/facebook/react
- **Lucide React** (`^1.77.0`) — ISC License — https://github.com/lucide-icons/lucide
- **Inter Font (`@fontsource/inter`)** — SIL Open Font License 1.1 (fonts) / MIT (wrapper) — https://github.com/rsms/inter
- **JetBrains Mono (`@fontsource/jetbrains-mono`)** — SIL Open Font License 1.1 (fonts) / MIT (wrapper) — https://github.com/JetBrains/JetBrainsMono

## Build & Developer Tooling (Not Bundled Into Runtime)

- **Vite** (MIT), **Tailwind CSS** (MIT), **TypeScript** (Apache-2.0), **pytest** (MIT), **PyInstaller** (GPL-2.0 with bootloader exception permitting distribution of standalone executables under your own license), **Pillow** (MIT-CMU, used only at build time for `installer/make_icon.py`), **Inno Setup** (Inno Setup License, used at build time for Windows setup packaging).
