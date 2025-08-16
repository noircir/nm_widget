#!/usr/bin/env python3
"""
Create a clean CSS file by removing unwanted sections while preserving:
1. Modal styles (without skin/general dark-mode)
2. Main widget styles (.nativemimic-speech-controls, .nativemimic-widget-container)
3. 1980s retro button styles
4. Retro dark mode variants (.nativemimic-speech-controls.nativemimic-dark-mode)
5. Essential animations and utilities
"""

def create_clean_css():
    input_file = '/Users/elenak/working_dir/saas_products/quickspeak_extension/mvp/content.css'
    output_file = '/Users/elenak/working_dir/saas_products/quickspeak_extension/mvp/content-optimized.css'
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    # Split content into blocks based on CSS rules
    lines = content.split('\n')
    
    cleaned_lines = []
    skip_block = False
    block_depth = 0
    current_block_lines = []
    
    for line in lines:
        stripped_line = line.strip()
        
        # Handle CSS selectors and blocks
        if '{' in line:
            block_depth += line.count('{')
            current_block_lines.append(line)
            
            # Check if this block should be removed
            block_content = '\n'.join(current_block_lines)
            if should_remove_block(block_content):
                skip_block = True
            else:
                # Keep this block start
                if not skip_block:
                    cleaned_lines.extend(current_block_lines)
                current_block_lines = []
        elif '}' in line:
            block_depth -= line.count('}')
            
            if skip_block:
                if block_depth <= 0:
                    skip_block = False
                    current_block_lines = []
            else:
                cleaned_lines.append(line)
                
            if block_depth <= 0:
                current_block_lines = []
        else:
            if skip_block:
                continue
            elif block_depth > 0:
                # Inside a CSS block
                cleaned_lines.append(line)
            else:
                # Outside blocks (comments, etc.)
                current_block_lines.append(line)
                
                # Check for section comments or standalone selectors
                if not stripped_line.startswith('/*') and stripped_line:
                    if should_remove_block('\n'.join(current_block_lines)):
                        current_block_lines = []
                    else:
                        cleaned_lines.extend(current_block_lines)
                        current_block_lines = []
                elif stripped_line.startswith('/*') or not stripped_line:
                    # Comments and empty lines - keep them
                    cleaned_lines.extend(current_block_lines)
                    current_block_lines = []
    
    # Add any remaining lines
    if current_block_lines and not skip_block:
        cleaned_lines.extend(current_block_lines)
    
    # Write cleaned content
    cleaned_content = '\n'.join(cleaned_lines)
    
    with open(output_file, 'w') as f:
        f.write(cleaned_content)
    
    print(f"Cleaned CSS written to {output_file}")
    print(f"Original: {len(lines)} lines")
    print(f"Cleaned: {len(cleaned_lines)} lines")
    print(f"Removed: {len(lines) - len(cleaned_lines)} lines")

def should_remove_block(block_content):
    """
    Determine if a CSS block should be removed.
    Remove:
    1. General .nativemimic-dark-mode (but NOT .nativemimic-speech-controls.nativemimic-dark-mode)
    2. All .nativemimic-skin- references
    """
    
    # Remove skin system
    if 'nativemimic-skin-' in block_content:
        return True
    
    # Keep speech-controls dark-mode variants (check first)
    if '.nativemimic-speech-controls.nativemimic-dark-mode' in block_content:
        return False
    
    # Remove general dark-mode
    if '.nativemimic-dark-mode' in block_content:
        return True
    
    return False

if __name__ == "__main__":
    create_clean_css()