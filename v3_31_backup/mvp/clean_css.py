#!/usr/bin/env python3
"""
Script to clean up content.css by removing old skin system and general dark mode styles
while preserving the 1980s retro styling and its dark mode variants.
"""

def clean_css():
    input_file = '/Users/elenak/working_dir/saas_products/quickspeak_extension/mvp/content.css'
    output_file = '/Users/elenak/working_dir/saas_products/quickspeak_extension/mvp/content-clean.css'
    
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    cleaned_lines = []
    skip_block = False
    brace_count = 0
    current_selector_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # If we're building a selector (looking for opening brace)
        if not skip_block:
            # Check if line contains selectors
            if line and (line.startswith('.') or line.startswith('#') or ',' in line):
                current_selector_lines.append(lines[i])
                
                # If we found the opening brace, we have a complete selector
                if '{' in line:
                    full_selector = ''.join(current_selector_lines)
                    
                    # Check if this selector should be removed
                    if should_remove_selector(full_selector):
                        skip_block = True
                        brace_count = 1
                        current_selector_lines = []
                        i += 1
                        continue
                    else:
                        # Keep this selector
                        cleaned_lines.extend(current_selector_lines)
                        current_selector_lines = []
                i += 1
                continue
            else:
                # Not a selector line, add any pending selector lines first
                if current_selector_lines:
                    cleaned_lines.extend(current_selector_lines)
                    current_selector_lines = []
        
        # If we're in a block to skip, count braces
        if skip_block:
            brace_count += line.count('{')
            brace_count -= line.count('}')
            
            # If braces are balanced, we've finished the block
            if brace_count <= 0:
                skip_block = False
                brace_count = 0
            i += 1
            continue
        
        # Keep the line if we're not skipping
        cleaned_lines.append(lines[i])
        i += 1
    
    # Write cleaned content
    with open(output_file, 'w') as f:
        f.writelines(cleaned_lines)
    
    print(f"Cleaned CSS written to {output_file}")
    print(f"Original: {len(lines)} lines")
    print(f"Cleaned: {len(cleaned_lines)} lines")
    print(f"Removed: {len(lines) - len(cleaned_lines)} lines")

def should_remove_selector(selector_line):
    """
    Determine if a CSS selector should be removed.
    Remove:
    1. General .nativemimic-dark-mode (but NOT .nativemimic-speech-controls.nativemimic-dark-mode)
    2. All .nativemimic-skin- references
    """
    
    # Remove skin system
    if '.nativemimic-skin-' in selector_line:
        return True
    
    # Remove general dark-mode but keep speech-controls dark-mode
    if '.nativemimic-dark-mode' in selector_line:
        if '.nativemimic-speech-controls.nativemimic-dark-mode' not in selector_line:
            return True
    
    return False

if __name__ == "__main__":
    clean_css()