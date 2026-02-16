#!/usr/bin/env python3
"""
Generate App Store marketing screenshots for TasteLanc
Creates 1284 × 2778px screenshots (iPhone 6.7" display)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Dimensions for iPhone 6.7" display
WIDTH = 1284
HEIGHT = 2778

# TasteLanc brand colors
COLORS = {
    'background': '#1A1A1A',
    'card': '#2A2A2A',
    'accent': '#C41E3A',  # Cardinal red
    'text': '#FFFFFF',
    'text_muted': '#8A8A8A',
    'text_secondary': '#B0B0B0',
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_screenshot(title, subtitle, feature_elements, filename, output_dir):
    """Create a single App Store screenshot"""

    # Create image with dark background
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(COLORS['background']))
    draw = ImageDraw.Draw(img)

    # Try to load fonts (fallback to default if not available)
    try:
        title_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
        subtitle_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 42)
        feature_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 36)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        feature_font = ImageFont.load_default()

    # Draw accent gradient bar at top
    for i in range(20):
        alpha = 255 - (i * 12)
        draw.rectangle([0, i*3, WIDTH, (i+1)*3], fill=hex_to_rgb(COLORS['accent']))

    # Draw title (centered, near top)
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (WIDTH - title_width) // 2
    draw.text((title_x, 150), title, font=title_font, fill=hex_to_rgb(COLORS['text']))

    # Draw subtitle
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (WIDTH - subtitle_width) // 2
    draw.text((subtitle_x, 250), subtitle, font=subtitle_font, fill=hex_to_rgb(COLORS['text_secondary']))

    # Draw mock phone frame
    phone_margin = 80
    phone_top = 380
    phone_width = WIDTH - (phone_margin * 2)
    phone_height = 1900
    phone_radius = 60

    # Phone bezel (dark gray)
    draw.rounded_rectangle(
        [phone_margin - 10, phone_top - 10,
         WIDTH - phone_margin + 10, phone_top + phone_height + 10],
        radius=phone_radius + 10,
        fill=hex_to_rgb('#3A3A3A')
    )

    # Phone screen (card background)
    draw.rounded_rectangle(
        [phone_margin, phone_top, WIDTH - phone_margin, phone_top + phone_height],
        radius=phone_radius,
        fill=hex_to_rgb(COLORS['card'])
    )

    # Draw feature elements inside phone
    y_offset = phone_top + 100
    for element in feature_elements:
        element_type = element.get('type', 'card')

        if element_type == 'header':
            # Section header
            draw.text(
                (phone_margin + 40, y_offset),
                element['text'],
                font=subtitle_font,
                fill=hex_to_rgb(COLORS['text'])
            )
            y_offset += 80

        elif element_type == 'card':
            # Restaurant card mockup
            card_margin = 40
            card_height = element.get('height', 200)

            draw.rounded_rectangle(
                [phone_margin + card_margin, y_offset,
                 WIDTH - phone_margin - card_margin, y_offset + card_height],
                radius=20,
                fill=hex_to_rgb('#3A3A3A')
            )

            # Card accent stripe
            draw.rectangle(
                [phone_margin + card_margin, y_offset,
                 phone_margin + card_margin + 8, y_offset + card_height],
                fill=hex_to_rgb(COLORS['accent'])
            )

            # Card text
            if 'title' in element:
                draw.text(
                    (phone_margin + card_margin + 30, y_offset + 30),
                    element['title'],
                    font=feature_font,
                    fill=hex_to_rgb(COLORS['text'])
                )
            if 'subtitle' in element:
                draw.text(
                    (phone_margin + card_margin + 30, y_offset + 80),
                    element['subtitle'],
                    font=feature_font,
                    fill=hex_to_rgb(COLORS['text_muted'])
                )

            y_offset += card_height + 20

        elif element_type == 'map':
            # Map placeholder
            map_height = element.get('height', 600)
            draw.rounded_rectangle(
                [phone_margin + 40, y_offset,
                 WIDTH - phone_margin - 40, y_offset + map_height],
                radius=20,
                fill=hex_to_rgb('#2A3A2A')
            )

            # Map markers
            markers = [(200, 150), (400, 300), (600, 200), (300, 450), (500, 500)]
            for mx, my in markers:
                draw.ellipse(
                    [phone_margin + 40 + mx - 15, y_offset + my - 15,
                     phone_margin + 40 + mx + 15, y_offset + my + 15],
                    fill=hex_to_rgb(COLORS['accent'])
                )

            # "Map View" label
            draw.text(
                (phone_margin + 80, y_offset + map_height - 60),
                "Interactive Map",
                font=feature_font,
                fill=hex_to_rgb(COLORS['text'])
            )
            y_offset += map_height + 20

        elif element_type == 'search':
            # Search bar
            draw.rounded_rectangle(
                [phone_margin + 40, y_offset,
                 WIDTH - phone_margin - 40, y_offset + 80],
                radius=40,
                fill=hex_to_rgb('#3A3A3A')
            )
            draw.text(
                (phone_margin + 80, y_offset + 20),
                "Search restaurants, bars...",
                font=feature_font,
                fill=hex_to_rgb(COLORS['text_muted'])
            )
            y_offset += 120

        elif element_type == 'chips':
            # Category chips
            chip_x = phone_margin + 40
            for chip_text in element.get('chips', []):
                chip_width = len(chip_text) * 22 + 40
                is_selected = element.get('selected') == chip_text

                draw.rounded_rectangle(
                    [chip_x, y_offset, chip_x + chip_width, y_offset + 50],
                    radius=25,
                    fill=hex_to_rgb(COLORS['accent'] if is_selected else '#3A3A3A')
                )
                draw.text(
                    (chip_x + 20, y_offset + 10),
                    chip_text,
                    font=feature_font,
                    fill=hex_to_rgb(COLORS['text'])
                )
                chip_x += chip_width + 15
                if chip_x > WIDTH - phone_margin - 150:
                    break
            y_offset += 80

        elif element_type == 'ai_chat':
            # AI chat bubble
            bubble_height = element.get('height', 150)
            draw.rounded_rectangle(
                [phone_margin + 40, y_offset,
                 WIDTH - phone_margin - 100, y_offset + bubble_height],
                radius=20,
                fill=hex_to_rgb(COLORS['accent'])
            )
            draw.text(
                (phone_margin + 60, y_offset + 20),
                "Mollie AI",
                font=feature_font,
                fill=hex_to_rgb(COLORS['text'])
            )
            if 'message' in element:
                # Wrap message text
                draw.text(
                    (phone_margin + 60, y_offset + 60),
                    element['message'],
                    font=feature_font,
                    fill=hex_to_rgb('#FFE0E0')
                )
            y_offset += bubble_height + 20

    # Bottom tagline
    tagline = "Taste Lancaster"
    tagline_bbox = draw.textbbox((0, 0), tagline, font=subtitle_font)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (WIDTH - tagline_width) // 2
    draw.text((tagline_x, HEIGHT - 120), tagline, font=subtitle_font, fill=hex_to_rgb(COLORS['accent']))

    # Save
    output_path = os.path.join(output_dir, filename)
    img.save(output_path, 'PNG', quality=95)
    print(f"Created: {output_path}")
    return output_path

def main():
    output_dir = '/Users/leandertoney/taste_lanc_app/assets/app-store-screenshots'
    os.makedirs(output_dir, exist_ok=True)

    screenshots = [
        {
            'title': 'Discover Lancaster',
            'subtitle': 'Find the best restaurants, bars & nightlife',
            'filename': '01_discover.png',
            'elements': [
                {'type': 'search'},
                {'type': 'chips', 'chips': ['All', 'Bars', 'Nightlife', 'Brunch'], 'selected': 'All'},
                {'type': 'header', 'text': 'Featured'},
                {'type': 'card', 'title': 'The Pressroom', 'subtitle': 'American · Downtown · 0.3 mi', 'height': 180},
                {'type': 'card', 'title': 'Tellus360', 'subtitle': 'Rooftop Bar · Downtown · 0.4 mi', 'height': 180},
                {'type': 'card', 'title': 'Horse Inn', 'subtitle': 'Gastropub · Historic · 0.5 mi', 'height': 180},
            ]
        },
        {
            'title': 'Interactive Map',
            'subtitle': 'See restaurants near you',
            'filename': '02_map.png',
            'elements': [
                {'type': 'search'},
                {'type': 'chips', 'chips': ['All', 'Bars', 'Rooftops'], 'selected': 'All'},
                {'type': 'map', 'height': 1000},
            ]
        },
        {
            'title': 'Ask Mollie AI',
            'subtitle': 'Your personal food concierge',
            'filename': '03_mollie_ai.png',
            'elements': [
                {'type': 'header', 'text': 'Chat with Mollie'},
                {'type': 'ai_chat', 'message': '"Looking for a romantic\ndinner spot downtown?"', 'height': 140},
                {'type': 'card', 'title': 'Recommended for you:', 'subtitle': '', 'height': 60},
                {'type': 'card', 'title': 'The Pressroom', 'subtitle': 'Upscale American · Perfect for dates', 'height': 160},
                {'type': 'card', 'title': 'Cork Factory Hotel', 'subtitle': 'Fine Dining · Romantic ambiance', 'height': 160},
            ]
        },
        {
            'title': 'Happy Hours',
            'subtitle': 'Never miss a deal',
            'filename': '04_happy_hours.png',
            'elements': [
                {'type': 'header', 'text': 'Active Now'},
                {'type': 'card', 'title': 'Tellus360', 'subtitle': '$5 craft beers · Until 7pm', 'height': 160},
                {'type': 'card', 'title': 'The Pressroom', 'subtitle': 'Half-price apps · Until 6pm', 'height': 160},
                {'type': 'header', 'text': 'Coming Up'},
                {'type': 'card', 'title': 'Horse Inn', 'subtitle': '$8 cocktails · Starts 4pm', 'height': 160},
                {'type': 'card', 'title': "Annie Bailey's", 'subtitle': 'Industry night · Starts 10pm', 'height': 160},
            ]
        },
        {
            'title': 'Vote Monthly',
            'subtitle': 'Crown Lancaster\'s best',
            'filename': '05_voting.png',
            'elements': [
                {'type': 'header', 'text': 'December 2024'},
                {'type': 'chips', 'chips': ['Best Bar', 'Best Brunch', 'Best Date'], 'selected': 'Best Bar'},
                {'type': 'card', 'title': '🥇 Tellus360', 'subtitle': '342 votes · Leading', 'height': 150},
                {'type': 'card', 'title': '🥈 The Pressroom', 'subtitle': '289 votes', 'height': 150},
                {'type': 'card', 'title': '🥉 Horse Inn', 'subtitle': '245 votes', 'height': 150},
                {'type': 'card', 'title': "4. Annie Bailey's", 'subtitle': '198 votes', 'height': 130},
            ]
        },
        {
            'title': 'Save Favorites',
            'subtitle': 'Build your personal list',
            'filename': '06_favorites.png',
            'elements': [
                {'type': 'header', 'text': 'Your Favorites'},
                {'type': 'card', 'title': '❤️ The Pressroom', 'subtitle': 'American · Downtown', 'height': 160},
                {'type': 'card', 'title': '❤️ Tellus360', 'subtitle': 'Rooftop · Nightlife', 'height': 160},
                {'type': 'card', 'title': '❤️ Horse Inn', 'subtitle': 'Gastropub · Craft Beer', 'height': 160},
                {'type': 'card', 'title': '❤️ Luca', 'subtitle': 'Italian · Fine Dining', 'height': 160},
            ]
        },
    ]

    print(f"Generating {len(screenshots)} App Store screenshots...")
    print(f"Size: {WIDTH} × {HEIGHT}px (iPhone 6.7\" display)")
    print()

    for screenshot in screenshots:
        create_screenshot(
            title=screenshot['title'],
            subtitle=screenshot['subtitle'],
            feature_elements=screenshot['elements'],
            filename=screenshot['filename'],
            output_dir=output_dir
        )

    print()
    print(f"✅ All screenshots saved to: {output_dir}")
    print()
    print("For 6.5\" display (1242 × 2688px), resize these images or")
    print("re-run with modified WIDTH/HEIGHT constants.")

if __name__ == '__main__':
    main()
