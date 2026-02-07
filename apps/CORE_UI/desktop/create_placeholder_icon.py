"""
Generate a simple placeholder icon for CORE-SE desktop app
This creates a basic 1024x1024 PNG that can be used with Tauri's icon generator
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL/Pillow not available. Install with: pip install Pillow")

def create_placeholder_icon():
    """Create a simple CORE-SE placeholder icon"""
    # Create a 1024x1024 image with a gradient background
    size = 1024
    img = Image.new('RGB', (size, size), color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Draw a circular background
    circle_color = '#0f3460'
    margin = 100
    draw.ellipse([margin, margin, size-margin, size-margin], fill=circle_color)
    
    # Draw a border
    border_color = '#16213e'
    border_width = 20
    draw.ellipse([margin, margin, size-margin, size-margin], outline=border_color, width=border_width)
    
    # Add text
    try:
        # Try to use a nice font if available
        font_size = 200
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    text = "CORE\nSE"
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) / 2
    y = (size - text_height) / 2 - 50
    
    # Draw text with a slight shadow
    shadow_offset = 5
    draw.text((x + shadow_offset, y + shadow_offset), text, fill='#000000', font=font, align='center')
    draw.text((x, y), text, fill='#e94560', font=font, align='center')
    
    # Save the icon
    output_path = 'icon-source.png'
    img.save(output_path)
    print(f"✓ Placeholder icon created: {output_path}")
    print(f"  Size: {size}x{size} PNG")
    print(f"\nNext step:")
    print(f"  npx @tauri-apps/cli icon {output_path}")
    
    return output_path

if __name__ == "__main__":
    if not PIL_AVAILABLE:
        print("\nError: Pillow library is required to generate icons.")
        print("\nInstall it with:")
        print("  pip install Pillow")
        print("\nOr manually create a 1024x1024 PNG icon and use:")
        print("  npx @tauri-apps/cli icon path/to/your-icon.png")
        exit(1)
    
    print("=" * 50)
    print("  CORE-SE Placeholder Icon Generator")
    print("=" * 50)
    print()
    
    try:
        create_placeholder_icon()
        print("\n✓ Success! Now run the icon generator:")
        print("  npx @tauri-apps/cli icon icon-source.png")
    except Exception as e:
        print(f"\n× Error: {e}")
        exit(1)
