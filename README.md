# TypeSimulator

> TypeSimulator is an OS-level keystroke simulator designed to bypass front-end web paste restrictions using a humanized typing cadence.

---

## Overview

TypeSimulator acts as a bridge between your clipboard and restrictive web environments. Instead of relying on standard copy-paste functionality—which is often blocked, disabled, or monitored by front-end web applications—this tool injects characters directly at the OS level. By utilizing randomized delays and cadence variations, it mimics natural human typing patterns to seamlessly and safely input your text.

---

## Key Features

- **Asynchronous UI:** A responsive, non-blocking interface built with CustomTkinter.
- **Global Hotkey Triggers:** System-wide hotkeys allow you to control the simulation from any window.
- **Strict Text Sanitization:** Automatically cleans and normalizes smart quotes, em/en dashes, and carriage returns to prevent injection errors.
- **Randomized Typing Delays:** Variable sleep intervals for standard characters versus punctuation and spaces, ensuring an authentic human typing rhythm.

---

## Pipeline Architecture

```text
CustomTkinter UI (Staged Text)
 └── Data Flow Event
      └── Daemon Worker Thread (Sanitization & Timing)
           └── OS-Level Keystroke Injection
                └── Target Web Browser / Application
```

---

## Prerequisites

- **Python:** 3.10+
- **OS:** Windows OS

---

## Installation & Setup

Use the following standard bash commands to set up the project:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment (Git Bash / PowerShell on Windows)
source venv/Scripts/activate

# Install required packages
pip install customtkinter pynput
```

---

## Usage

1. **Run the application:** Launch the user interface by executing `python main.py`.
2. **Stage the text:** Paste the content you wish to type directly into the TypeSimulator UI.
3. **Set target window focus:** Switch to your desired application or web browser and click inside the target input field so it has focus.
4. **Execute the F9 trigger:** Press `F9` on your keyboard to begin the humanized typing process. You can press `ESC` at any time to instantly abort the sequence.

---

## Author & Project Information

- **Developer:** Muhammad Kamal
- **Project Type:** Independent portfolio project
