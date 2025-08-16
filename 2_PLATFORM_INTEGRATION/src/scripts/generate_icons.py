#!/usr/bin/env python3
"""Quick script to generate lime green PNG icons for QuickSpeak extension"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create image with lime green gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Create lime green rounded rectangle
    draw.rounded_rectangle(
        [(0, 0), (size-1, size-1)], 
        radius=size//5, 
        fill=(50, 205, 50, 255)  # Lime green
    )
    
    # Add white "Q" text
    try:
        font_size = int(size * 0.6)
        # Try to use a system font
        try:
            font = ImageFont.truetype("Arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
        
        # Calculate text position to center it
        bbox = draw.textbbox((0, 0), "Q", font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - 2  # Slight adjustment
        
        draw.text((x, y), "Q", fill=(255, 255, 255, 255), font=font)
    except:
        # Fallback if font fails
        draw.text((size//4, size//4), "Q", fill=(255, 255, 255, 255))
    
    img.save(filename, 'PNG')
    print(f"Created {filename}")

if __name__ == "__main__":
    # Create all required icon sizes
    sizes = [16, 32, 48, 128]
    for size in sizes:
        create_icon(size, f"icon{size}.png")
    
    print("All icons created! Remove the old .svg files and reload the extension.")