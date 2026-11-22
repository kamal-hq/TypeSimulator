import threading
from ui import TypeSimulatorUI
from engine import setup_listener, humanized_type, sanitize_text

def main():
    app = TypeSimulatorUI()
    abort_event = threading.Event()
    
    def typing_task(text_to_type):
        sanitized = sanitize_text(text_to_type)
        humanized_type(sanitized, abort_event)
        
        # Use the master.after() equivalent to safely update UI from background thread
        app.after(0, app.unlock_ui)
        app.after(0, app.clear_text)
        app.after(0, lambda: app.update_status("Ready"))

    def start_typing_sequence():
        text = app.text_box.get("1.0", "end-1c")
        if not text.strip():
            return
            
        abort_event.clear()
        app.lock_ui()
        app.update_status("Typing...")
        
        # Start typing loop inside a threading.Thread with daemon=True
        t = threading.Thread(target=typing_task, args=(text,), daemon=True)
        t.start()

    def on_f9():
        # Schedule the UI read and thread start on the main Tkinter thread to avoid crashes
        app.after(0, start_typing_sequence)

    def on_ui_esc():
        abort_event.set()

    # Link the UI emergency stop button to the abort event
    app.emergency_stop_button.configure(command=on_ui_esc)

    # Initialize global hotkey listener (F9 to start, ESC to abort)
    listener = setup_listener(on_f9, abort_event)
    listener.start()

    # Initialize the application loop at the bottom of the script
    app.mainloop()

if __name__ == "__main__":
    main()
