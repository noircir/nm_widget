#!/usr/bin/env python3
"""
Extract clean CSS by preserving only the sections we want to keep.
"""

def extract_clean_css():
    input_file = '/Users/elenak/working_dir/saas_products/quickspeak_extension/mvp/content.css'
    output_file = '/Users/elenak/working_dir/saas_products/quickspeak_extension/mvp/content-optimized.css'
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    # Split into blocks based on major sections
    lines = content.split('\n')
    
    keep_lines = []
    i = 0
    skip_until_next_section = False
    
    while i < len(lines):
        line = lines[i].strip()
        
        # Check for section headers to reset skip flag
        if line.startswith('/*') and not line.startswith('/* '):
            skip_until_next_section = False
        
        # Skip skin system sections
        if 'skin-presets' in line or 'skin-custom' in line or 'skin-grid' in line:
            skip_until_next_section = True
        
        # Skip general dark mode sections (but not speech-controls dark mode)
        if '.nativemimic-dark-mode' in line and '.nativemimic-speech-controls.nativemimic-dark-mode' not in line:
            # Skip this CSS block
            brace_count = 0
            while i < len(lines):
                current_line = lines[i]
                brace_count += current_line.count('{')
                brace_count -= current_line.count('}')
                i += 1
                if brace_count <= 0:
                    break
            continue
        
        # Skip skin-related selectors
        if '.nativemimic-skin-' in line:
            # Skip this CSS block
            brace_count = 0
            while i < len(lines):
                current_line = lines[i]
                brace_count += current_line.count('{')
                brace_count -= current_line.count('}')
                i += 1
                if brace_count <= 0:
                    break
            continue
        
        if not skip_until_next_section:
            keep_lines.append(lines[i])
        
        i += 1
    
    # Join lines and write to output
    cleaned_content = '\n'.join(keep_lines)
    
    with open(output_file, 'w') as f:
        f.write(cleaned_content)
    
    print(f"Cleaned CSS written to {output_file}")
    print(f"Original: {len(lines)} lines")
    print(f"Cleaned: {len(keep_lines)} lines")
    print(f"Removed: {len(lines) - len(keep_lines)} lines")

if __name__ == "__main__":
    extract_clean_css()