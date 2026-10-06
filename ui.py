import customtkinter as ctk

class TypeSimulatorUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Type Simulator")
        self.geometry("500x400")
        
        # Configure grid layout for the main window (3 rows, 1 column)
        self.grid_rowconfigure(0, weight=0) # Header
        self.grid_rowconfigure(1, weight=1) # Core (expands)
        self.grid_rowconfigure(2, weight=0) # Footer
        self.grid_columnconfigure(0, weight=1)

        # --- Header Frame ---
        self.header_frame = ctk.CTkFrame(self)
        self.header_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 5))
        self.header_frame.grid_columnconfigure(0, weight=1)
        self.header_frame.grid_columnconfigure(1, weight=1)

        self.status_label = ctk.CTkLabel(self.header_frame, text="Status: Ready", anchor="w")
        self.status_label.grid(row=0, column=0, sticky="w", padx=10, pady=5)

        self.reminder_label = ctk.CTkLabel(self.header_frame, text="Target text box and press F9", anchor="e")
        self.reminder_label.grid(row=0, column=1, sticky="e", padx=10, pady=5)

        # --- Core Frame ---
        self.core_frame = ctk.CTkFrame(self)
        self.core_frame.grid(row=1, column=0, sticky="nsew", padx=10, pady=5)
        self.core_frame.grid_rowconfigure(0, weight=1)
        self.core_frame.grid_columnconfigure(0, weight=1)

        self.text_box = ctk.CTkTextbox(self.core_frame)
        self.text_box.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)

        # --- Footer Frame ---
        self.footer_frame = ctk.CTkFrame(self)
        self.footer_frame.grid(row=2, column=0, sticky="ew", padx=10, pady=(5, 10))
        self.footer_frame.grid_columnconfigure(0, weight=1)
        self.footer_frame.grid_columnconfigure(1, weight=1)

        self.always_on_top_var = ctk.BooleanVar(value=False)
        self.always_on_top_checkbox = ctk.CTkCheckBox(
            self.footer_frame, 
            text="Always on Top", 
            variable=self.always_on_top_var,
            command=self.toggle_always_on_top
        )
        self.always_on_top_checkbox.grid(row=0, column=0, sticky="w", padx=10, pady=5)

        self.emergency_stop_button = ctk.CTkButton(
            self.footer_frame, 
            text="Emergency Stop (ESC)",
            fg_color="darkred",
            hover_color="red"
        )
        self.emergency_stop_button.grid(row=0, column=1, sticky="e", padx=10, pady=5)

    def toggle_always_on_top(self):
        self.attributes("-topmost", self.always_on_top_var.get())

    def lock_ui(self):
        self.text_box.configure(state="disabled")

    def unlock_ui(self):
        self.text_box.configure(state="normal")

    def update_status(self, message):
        self.status_label.configure(text=f"Status: {message}")

    def clear_text(self):
        current_state = self.text_box.cget("state")
        if current_state == "disabled":
            self.text_box.configure(state="normal")
            
        self.text_box.delete("1.0", "end")
        
        if current_state == "disabled":
            self.text_box.configure(state="disabled")

if __name__ == "__main__":
    app = TypeSimulatorUI()
    app.mainloop()
