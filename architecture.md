# TypeSimulator Architecture

## 1. The Focus Paradox
A fundamental challenge in automating typing into external applications (like web browsers) is the issue of window focus. If the typing simulator requires the user to click a "Start" button within its own GUI, the simulator window becomes the active window, stealing focus away from the intended target application. 

TypeSimulator solves this "Focus Paradox" by leveraging a global hotkey listener via the `pynput` library. By binding the execution trigger to `F9`, the operating system intercepts the keystroke globally. This allows the user to click and focus on the target text box in their web browser, and then press `F9`. The trigger fires in the background without causing the OS to shift window focus, ensuring that the simulated keystrokes are delivered accurately to the active target application.

## 2. Threading Model
The application relies on a multi-threaded architecture to maintain a responsive user interface during long-running operations. The `CustomTkinter` UI loop runs on the main thread, handling all rendering and user interactions. 

When the `F9` global hotkey triggers the execution engine, the typing sequence is offloaded to a background thread using `threading.Thread(daemon=True)`. This separation is crucial:
*   **UI Responsiveness:** If the typing loop ran on the main thread, the `CustomTkinter` interface would freeze entirely until the sequence finished, preventing the user from using the Emergency Stop button.
*   **Daemon Process:** By marking the background thread as a `daemon`, Python ensures that the thread will not block the program from exiting. If the user closes the main application window, the daemon thread is automatically and cleanly terminated by the OS, preventing orphaned background typing processes.

Thread-safe UI updates upon completion or abortion are managed using the `master.after()` method, which safely schedules the UI reset callbacks back onto the main thread's event queue.

## 3. Anti-Detection & Sanitization
To simulate authentic human behavior and bypass basic automated detection mechanisms, the typing engine implements a weighted randomization algorithm. Rather than using a static delay between keystrokes, the engine calculates a unique delay for each character:
*   **Standard Characters:** Delays are randomized between `0.03s` and `0.08s` to mimic a realistic typing speed.
*   **Punctuation & Spaces:** Delays are increased to `0.1s` - `0.25s`, simulating the natural cognitive and physical micro-pauses humans take when transitioning between words or completing sentences.

Additionally, text copied from word processors like Microsoft Word often contains rich text artifacts that fail to render or trigger errors in web forms. The engine utilizes a dictionary pipeline to sanitize the text prior to typing. This pipeline intercepts and normalizes:
*   Smart quotes (e.g., `‘`, `’`, `“`, `”`) into standard straight ASCII quotes (`'`, `"`).
*   En-dashes (`–`) and Em-dashes (`—`) into standard hyphens (`-`).
*   Carriage returns (`\r\n`) into standard UNIX newlines (`\n`). 

This ensures all input is normalized into standard ASCII keystrokes that are compatible with any target text box.
