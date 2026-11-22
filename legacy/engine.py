import pynput
import time
import threading
import random
import string
from pynput.keyboard import Controller, GlobalHotKeys

def sanitize_text(text: str) -> str:
    """
    Replaces smart quotes with straight quotes, em/en dashes with standard hyphens,
    and normalizes carriage returns to standard newlines.
    """
    # Normalize carriage returns
    text = text.replace('\r\n', '\n')
    
    # Replace smart single and double quotes
    text = text.replace('‘', "'").replace('’', "'")
    text = text.replace('“', '"').replace('”', '"')
    
    # Replace en and em dashes
    text = text.replace('–', '-').replace('—', '-')
    
    return text

def humanized_type(text: str, abort_event: threading.Event):
    """
    Types characters one by one with a randomized delay to simulate human typing.
    Checks the abort_event on every iteration to stop early if set.
    """
    keyboard = Controller()
    
    for char in text:
        if abort_event.is_set():
            break
            
        keyboard.type(char)
        
        # Apply longer delay for spaces and punctuation, shorter for standard characters
        if char.isspace() or char in string.punctuation:
            delay = random.uniform(0.1, 0.25)
        else:
            delay = random.uniform(0.03, 0.08)
            
        time.sleep(delay)

def setup_listener(trigger_callback, abort_event: threading.Event):
    """
    Initializes a GlobalHotKeys listener for <f9> and <esc>.
    """
    def on_esc():
        abort_event.set()
        
    listener = GlobalHotKeys({
        '<f9>': trigger_callback,
        '<esc>': on_esc
    })
    
    return listener
