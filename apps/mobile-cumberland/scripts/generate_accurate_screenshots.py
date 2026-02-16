#!/usr/bin/env python3
"""
Generate accurate App Store screenshots based on actual TasteLanc code
Creates 1284 × 2778px screenshots (iPhone 6.7" display)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# iPhone 6.7" dimensions
WIDTH = 1284
HEIGHT = 2778

# Exact colors from src/constants/colors.ts
COLORS = {
    'primary': '#1A1A1A',
    'primaryLight': '#222222',
    'accent': '#A41E22',
    'accentLight': '#C42428',
    'text': '#FFFFFF',
    'textMuted': '#B3B3B3',  # rgba(255,255,255,0.7)
    'textSecondary': '#808080',  # rgba(255,255,255,0.5)
    'cardBg': '#252525',
    'cardBgElevated': '#2A2A2A',
    'border': '#262626',  # rgba(255,255,255,0.15)
    'tabBarBg': '#1A1A1A',
}

# Spacing from colors.ts
SPACING = {'xs': 4, 'sm': 8, 'md': 16, 'lg': 24, 'xl': 32}
RADIUS = {'xs': 4, 'sm': 8, 'md': 12, 'lg': 16, 'xl': 20}

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def draw_rounded_rect(draw, coords, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle(coords, radius=radius, fill=fill, outline=outline, width=width)

def load_fonts():
    """Load system fonts with fallback"""
    try:
        return {
            'title': ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 60),
            'heading': ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 44),
            'section': ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 40),
            'body': ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 32),
            'small': ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 26),
            'caption': ImageFont.truetype('/System/Library/Fonts/SFNS.ttf', 22),
        }
    except:
        try:
            return {
                'title': ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 60),
                'heading': ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 44),
                'section': ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 40),
                'body': ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 32),
                'small': ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 26),
                'caption': ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22),
            }
        except:
            default = ImageFont.load_default()
            return {k: default for k in ['title', 'heading', 'section', 'body', 'small', 'caption']}

def draw_status_bar(draw, fonts, y=60):
    """Draw iOS status bar"""
    # Time
    draw.text((80, y), "9:41", font=fonts['body'], fill=hex_to_rgb(COLORS['text']))
    # Right side icons (signal, wifi, battery)
    draw.text((WIDTH - 200, y), "100%", font=fonts['small'], fill=hex_to_rgb(COLORS['text']))

def draw_tab_bar(draw, fonts, active_tab='Home'):
    """Draw bottom tab bar"""
    tab_height = 160
    tab_y = HEIGHT - tab_height

    # Tab bar background
    draw.rectangle([0, tab_y, WIDTH, HEIGHT], fill=hex_to_rgb(COLORS['tabBarBg']))
    draw.line([(0, tab_y), (WIDTH, tab_y)], fill=hex_to_rgb(COLORS['border']), width=2)

    tabs = ['Home', 'Search', 'Vote', 'Favorites', 'Profile']
    tab_width = WIDTH // len(tabs)

    for i, tab in enumerate(tabs):
        x = i * tab_width + tab_width // 2
        color = COLORS['accent'] if tab == active_tab else COLORS['textMuted']

        # Tab icon (circle placeholder)
        icon_y = tab_y + 40
        draw.ellipse([x-20, icon_y, x+20, icon_y+40], fill=hex_to_rgb(color))

        # Tab label
        label_bbox = draw.textbbox((0, 0), tab, font=fonts['caption'])
        label_width = label_bbox[2] - label_bbox[0]
        draw.text((x - label_width//2, icon_y + 50), tab, font=fonts['caption'], fill=hex_to_rgb(color))

def draw_section_header(draw, fonts, title, action_text, y):
    """Draw section header like in the app"""
    # Title
    draw.text((32, y), title, font=fonts['section'], fill=hex_to_rgb(COLORS['text']))

    # Action text (right side)
    if action_text:
        action_bbox = draw.textbbox((0, 0), action_text, font=fonts['small'])
        action_width = action_bbox[2] - action_bbox[0]
        draw.text((WIDTH - 32 - action_width, y + 8), action_text,
                  font=fonts['small'], fill=hex_to_rgb(COLORS['accent']))

    return y + 60

def draw_restaurant_card(draw, fonts, name, categories, address, y, has_image=True):
    """Draw a RestaurantCard matching the actual component"""
    card_margin = 32
    card_width = WIDTH - (card_margin * 2)
    image_height = 280
    content_height = 180
    card_height = image_height + content_height

    # Card background with rounded corners
    draw_rounded_rect(draw,
        [card_margin, y, card_margin + card_width, y + card_height],
        radius=RADIUS['md'],
        fill=hex_to_rgb(COLORS['cardBg']))

    # Image area
    draw_rounded_rect(draw,
        [card_margin, y, card_margin + card_width, y + image_height],
        radius=RADIUS['md'],
        fill=hex_to_rgb(COLORS['cardBgElevated']))

    if has_image:
        # Simulated image with gradient
        for i in range(image_height):
            alpha = 0.3 + (i / image_height) * 0.3
            color = tuple(int(c * (1-alpha)) for c in hex_to_rgb(COLORS['cardBgElevated']))
            draw.line([(card_margin, y + i), (card_margin + card_width, y + i)], fill=color)

    # Favorite button (top right)
    fav_x = card_margin + card_width - 60
    fav_y = y + 16
    draw.ellipse([fav_x, fav_y, fav_x + 72, fav_y + 72], fill=(0, 0, 0, 128))
    draw.ellipse([fav_x + 16, fav_y + 16, fav_x + 56, fav_y + 56],
                 outline=hex_to_rgb(COLORS['text']), width=3)

    # Content area
    content_y = y + image_height + 24

    # Restaurant name
    draw.text((card_margin + 24, content_y), name,
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))

    # Category badges
    badge_y = content_y + 50
    badge_x = card_margin + 24
    for cat in categories[:2]:
        cat_bbox = draw.textbbox((0, 0), cat, font=fonts['caption'])
        cat_width = cat_bbox[2] - cat_bbox[0] + 32

        draw_rounded_rect(draw,
            [badge_x, badge_y, badge_x + cat_width, badge_y + 44],
            radius=RADIUS['xs'],
            fill=hex_to_rgb(COLORS['cardBgElevated']),
            outline=hex_to_rgb(COLORS['accent']),
            width=2)
        draw.text((badge_x + 16, badge_y + 8), cat,
                  font=fonts['caption'], fill=hex_to_rgb(COLORS['textMuted']))
        badge_x += cat_width + 12

    # Address
    draw.text((card_margin + 24, badge_y + 56), address,
              font=fonts['small'], fill=hex_to_rgb(COLORS['textMuted']))

    return y + card_height + 24

def draw_happy_hour_banner(draw, fonts, deal, restaurant, time, x, y, width=560):
    """Draw HappyHourBanner matching the component"""
    height = 144

    # Banner background
    draw_rounded_rect(draw,
        [x, y, x + width, y + height],
        radius=RADIUS['md'],
        fill=hex_to_rgb(COLORS['cardBg']),
        outline=hex_to_rgb(COLORS['accent']),
        width=2)

    # Deal text
    draw.text((x + 32, y + 24), deal, font=fonts['body'], fill=hex_to_rgb(COLORS['text']))

    # Restaurant name
    draw.text((x + 32, y + 70), restaurant, font=fonts['small'], fill=hex_to_rgb(COLORS['textMuted']))

    # Time badge
    time_bbox = draw.textbbox((0, 0), time, font=fonts['caption'])
    time_width = time_bbox[2] - time_bbox[0] + 48
    time_x = x + width - time_width - 24

    draw_rounded_rect(draw,
        [time_x, y + height//2 - 22, time_x + time_width, y + height//2 + 22],
        radius=RADIUS['sm'],
        fill=hex_to_rgb(COLORS['accent']))
    draw.text((time_x + 24, y + height//2 - 12), time,
              font=fonts['caption'], fill=hex_to_rgb(COLORS['text']))

    return height

def draw_mollie_fab(draw, fonts, y_offset=0):
    """Draw the Ask Mollie floating action button"""
    fab_width = 280
    fab_height = 100
    fab_x = WIDTH - fab_width - 32
    fab_y = HEIGHT - 280 - y_offset

    # FAB background with shadow
    draw_rounded_rect(draw,
        [fab_x, fab_y, fab_x + fab_width, fab_y + fab_height],
        radius=50,
        fill=hex_to_rgb(COLORS['accent']))

    # Avatar circle
    draw.ellipse([fab_x + 16, fab_y + 14, fab_x + 88, fab_y + 86],
                 fill=hex_to_rgb(COLORS['primary']))

    # Text
    draw.text((fab_x + 100, fab_y + 30), "Ask Mollie",
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))

def draw_featured_card(draw, fonts, name, categories, x, y):
    """Draw a FeaturedCard (horizontal scroll card)"""
    card_width = int(WIDTH * 0.7)  # 70% viewport
    card_height = int(card_width * 1.4)  # Portrait aspect

    # Card background
    draw_rounded_rect(draw,
        [x, y, x + card_width, y + card_height],
        radius=RADIUS['lg'],
        fill=hex_to_rgb(COLORS['cardBgElevated']))

    # Gradient overlay at bottom
    overlay_height = card_height // 3
    overlay_y = y + card_height - overlay_height
    draw_rounded_rect(draw,
        [x, overlay_y, x + card_width, y + card_height],
        radius=RADIUS['lg'],
        fill=(0, 0, 0))

    # Favorite button
    fav_x = x + card_width - 80
    draw.ellipse([fav_x, y + 16, fav_x + 64, y + 80], fill=(0, 0, 0, 180))

    # Content at bottom
    content_y = y + card_height - 160
    draw.text((x + 32, content_y), name, font=fonts['heading'], fill=hex_to_rgb(COLORS['text']))

    # Category badges
    badge_y = content_y + 56
    badge_x = x + 32
    for cat in categories[:2]:
        cat_bbox = draw.textbbox((0, 0), cat, font=fonts['caption'])
        cat_width = cat_bbox[2] - cat_bbox[0] + 32

        draw_rounded_rect(draw,
            [badge_x, badge_y, badge_x + cat_width, badge_y + 40],
            radius=RADIUS['xs'],
            fill=(255, 255, 255, 40),
            outline=hex_to_rgb(COLORS['accent']),
            width=2)
        draw.text((badge_x + 16, badge_y + 6), cat,
                  font=fonts['caption'], fill=hex_to_rgb(COLORS['text']))
        badge_x += cat_width + 12

    return card_width

def create_home_screen(output_dir, fonts):
    """Create HomeScreen mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(COLORS['primary']))
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, fonts)
    draw_tab_bar(draw, fonts, 'Home')

    y = 140

    # Happy Hour Section
    y = draw_section_header(draw, fonts, "Happy Hour Specials", "View All", y)
    y += 16
    draw_happy_hour_banner(draw, fonts, "$2 off Blue Moons", "Tellus360", "4-6pm", 32, y)
    draw_happy_hour_banner(draw, fonts, "Half Price Apps", "The Pressroom", "5-7pm", 620, y)
    y += 180

    # Featured Section
    y = draw_section_header(draw, fonts, "Featured for You", "View All", y)
    y += 16
    draw_featured_card(draw, fonts, "The Pressroom", ["American", "Bar"], 32, y)
    draw_featured_card(draw, fonts, "Tellus360", ["Rooftop", "Nightlife"], 32 + int(WIDTH * 0.7) + 16, y)
    y += int(WIDTH * 0.7 * 1.4) + 32

    # Other Places Section
    y = draw_section_header(draw, fonts, "Other Places Nearby", "Search", y)
    y += 16
    y = draw_restaurant_card(draw, fonts, "Horse Inn", ["Gastropub", "Dinner"], "540 E Fulton St", y)
    y = draw_restaurant_card(draw, fonts, "Luca", ["Italian", "Fine Dining"], "436 W James St", y)

    # Mollie FAB
    draw_mollie_fab(draw, fonts)

    img.save(os.path.join(output_dir, '01_home.png'), 'PNG')
    print("Created: 01_home.png")

def create_search_screen(output_dir, fonts):
    """Create SearchScreen mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(COLORS['primary']))
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, fonts)
    draw_tab_bar(draw, fonts, 'Search')

    # Header with search bar
    header_y = 140
    draw.rectangle([0, header_y - 20, WIDTH, header_y + 160], fill=hex_to_rgb(COLORS['primaryLight']))

    # Search bar
    search_y = header_y + 20
    draw_rounded_rect(draw,
        [32, search_y, WIDTH - 160, search_y + 80],
        radius=RADIUS['md'],
        fill=hex_to_rgb(COLORS['cardBg']))
    draw.text((60, search_y + 20), "Search restaurants, bars...",
              font=fonts['body'], fill=hex_to_rgb(COLORS['textSecondary']))

    # List/Map toggle
    toggle_x = WIDTH - 140
    draw_rounded_rect(draw, [toggle_x, search_y, toggle_x + 100, search_y + 80],
                      radius=RADIUS['sm'], fill=hex_to_rgb(COLORS['cardBg']))
    draw.rectangle([toggle_x, search_y, toggle_x + 50, search_y + 80],
                   fill=hex_to_rgb(COLORS['accent']))

    # Category chips
    chips_y = header_y + 120
    chips = ['All', 'Bars', 'Nightlife', 'Rooftops', 'Brunch']
    chip_x = 32
    for i, chip in enumerate(chips):
        chip_bbox = draw.textbbox((0, 0), chip, font=fonts['small'])
        chip_width = chip_bbox[2] - chip_bbox[0] + 40

        is_selected = i == 0
        draw_rounded_rect(draw,
            [chip_x, chips_y, chip_x + chip_width, chips_y + 56],
            radius=28,
            fill=hex_to_rgb(COLORS['accent'] if is_selected else COLORS['cardBg']))
        draw.text((chip_x + 20, chips_y + 12), chip,
                  font=fonts['small'], fill=hex_to_rgb(COLORS['text']))
        chip_x += chip_width + 16

    # Results count
    y = header_y + 200
    draw.text((32, y), "24 results", font=fonts['small'], fill=hex_to_rgb(COLORS['textMuted']))
    y += 50

    # Restaurant cards
    y = draw_restaurant_card(draw, fonts, "The Pressroom", ["American", "Bar"], "26 W King St", y)
    y = draw_restaurant_card(draw, fonts, "Tellus360", ["Rooftop", "Nightlife"], "24 E King St", y)
    y = draw_restaurant_card(draw, fonts, "Horse Inn", ["Gastropub", "Dinner"], "540 E Fulton St", y)

    img.save(os.path.join(output_dir, '02_search.png'), 'PNG')
    print("Created: 02_search.png")

def create_map_screen(output_dir, fonts):
    """Create Map View mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb('#212121'))
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, fonts)
    draw_tab_bar(draw, fonts, 'Search')

    # Header with search bar
    header_y = 140
    draw.rectangle([0, header_y - 20, WIDTH, header_y + 160], fill=hex_to_rgb(COLORS['primaryLight']))

    # Search bar
    search_y = header_y + 20
    draw_rounded_rect(draw,
        [32, search_y, WIDTH - 160, search_y + 80],
        radius=RADIUS['md'],
        fill=hex_to_rgb(COLORS['cardBg']))
    draw.text((60, search_y + 20), "Search restaurants, bars...",
              font=fonts['body'], fill=hex_to_rgb(COLORS['textSecondary']))

    # List/Map toggle (map selected)
    toggle_x = WIDTH - 140
    draw_rounded_rect(draw, [toggle_x, search_y, toggle_x + 100, search_y + 80],
                      radius=RADIUS['sm'], fill=hex_to_rgb(COLORS['cardBg']))
    draw.rectangle([toggle_x + 50, search_y, toggle_x + 100, search_y + 80],
                   fill=hex_to_rgb(COLORS['accent']))

    # Category chips
    chips_y = header_y + 120
    chips = ['All', 'Bars', 'Nightlife']
    chip_x = 32
    for i, chip in enumerate(chips):
        chip_bbox = draw.textbbox((0, 0), chip, font=fonts['small'])
        chip_width = chip_bbox[2] - chip_bbox[0] + 40

        is_selected = i == 0
        draw_rounded_rect(draw,
            [chip_x, chips_y, chip_x + chip_width, chips_y + 56],
            radius=28,
            fill=hex_to_rgb(COLORS['accent'] if is_selected else COLORS['cardBg']))
        draw.text((chip_x + 20, chips_y + 12), chip,
                  font=fonts['small'], fill=hex_to_rgb(COLORS['text']))
        chip_x += chip_width + 16

    # Map area (dark style)
    map_y = header_y + 190
    map_height = HEIGHT - map_y - 160

    # Draw some "roads"
    draw.line([(200, map_y + 200), (WIDTH - 200, map_y + 600)], fill=(60, 60, 60), width=8)
    draw.line([(400, map_y + 100), (400, map_y + map_height - 100)], fill=(60, 60, 60), width=8)
    draw.line([(100, map_y + 400), (WIDTH - 100, map_y + 400)], fill=(55, 55, 55), width=6)

    # Map markers (TasteLanc pins)
    markers = [(350, 300), (600, 450), (450, 600), (800, 350), (250, 500)]
    for mx, my in markers:
        # Pin shadow
        draw.ellipse([mx - 24, map_y + my - 24, mx + 24, map_y + my + 24],
                     fill=hex_to_rgb(COLORS['accent']))
        # White center
        draw.ellipse([mx - 12, map_y + my - 12, mx + 12, map_y + my + 12],
                     fill=hex_to_rgb(COLORS['text']))

    # User location dot
    user_x, user_y = 500, 500
    draw.ellipse([user_x - 16, map_y + user_y - 16, user_x + 16, map_y + user_y + 16],
                 fill=(10, 132, 255))
    draw.ellipse([user_x - 8, map_y + user_y - 8, user_x + 8, map_y + user_y + 8],
                 fill=hex_to_rgb(COLORS['text']))

    # Distance filter button (top right)
    filter_y = map_y + 32
    draw_rounded_rect(draw,
        [WIDTH - 220, filter_y, WIDTH - 32, filter_y + 64],
        radius=32,
        fill=hex_to_rgb(COLORS['cardBg']))
    draw.text((WIDTH - 180, filter_y + 14), "Distance", font=fonts['small'], fill=hex_to_rgb(COLORS['text']))

    # Location button (bottom right)
    loc_y = HEIGHT - 320
    draw.ellipse([WIDTH - 120, loc_y, WIDTH - 32, loc_y + 88],
                 fill=hex_to_rgb(COLORS['cardBg']))

    # Results count (bottom left)
    draw_rounded_rect(draw,
        [32, HEIGHT - 260, 280, HEIGHT - 200],
        radius=32,
        fill=hex_to_rgb(COLORS['cardBg']))
    draw.text((60, HEIGHT - 248), "24 places", font=fonts['small'], fill=hex_to_rgb(COLORS['text']))

    img.save(os.path.join(output_dir, '03_map.png'), 'PNG')
    print("Created: 03_map.png")

def create_mollie_screen(output_dir, fonts):
    """Create Mollie AI chat mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(COLORS['primary']))
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, fonts)

    # Chat header
    header_y = 120
    draw.rectangle([0, header_y, WIDTH, header_y + 120], fill=hex_to_rgb(COLORS['primaryLight']))
    draw.text((WIDTH // 2 - 100, header_y + 36), "Chat with Mollie",
              font=fonts['section'], fill=hex_to_rgb(COLORS['text']))

    # Close button
    draw.text((WIDTH - 80, header_y + 40), "×", font=fonts['title'], fill=hex_to_rgb(COLORS['textMuted']))

    y = header_y + 160

    # AI message bubble
    bubble_width = WIDTH - 200
    draw_rounded_rect(draw,
        [32, y, 32 + bubble_width, y + 160],
        radius=RADIUS['lg'],
        fill=hex_to_rgb(COLORS['accent']))
    draw.text((60, y + 24), "Hi! I'm Mollie, your food concierge.",
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))
    draw.text((60, y + 70), "What are you in the mood for today?",
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))
    y += 200

    # User message
    user_msg = "Looking for a nice dinner spot"
    msg_bbox = draw.textbbox((0, 0), user_msg, font=fonts['body'])
    msg_width = msg_bbox[2] - msg_bbox[0] + 64
    msg_x = WIDTH - 32 - msg_width

    draw_rounded_rect(draw,
        [msg_x, y, WIDTH - 32, y + 80],
        radius=RADIUS['lg'],
        fill=hex_to_rgb(COLORS['cardBg']))
    draw.text((msg_x + 32, y + 20), user_msg,
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))
    y += 120

    # AI response with recommendations
    draw_rounded_rect(draw,
        [32, y, WIDTH - 100, y + 400],
        radius=RADIUS['lg'],
        fill=hex_to_rgb(COLORS['accent']))
    draw.text((60, y + 24), "Great choice! Here are my top picks",
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))
    draw.text((60, y + 70), "for dinner tonight:",
              font=fonts['body'], fill=hex_to_rgb(COLORS['text']))

    # Recommendation cards inside bubble
    rec_y = y + 130
    for name in ["The Pressroom - American fine dining", "Luca - Italian cuisine"]:
        draw_rounded_rect(draw,
            [60, rec_y, WIDTH - 140, rec_y + 80],
            radius=RADIUS['md'],
            fill=(0, 0, 0, 60))
        draw.text((88, rec_y + 22), name, font=fonts['small'], fill=hex_to_rgb(COLORS['text']))
        rec_y += 100

    # Input bar at bottom
    input_y = HEIGHT - 180
    draw.rectangle([0, input_y, WIDTH, HEIGHT], fill=hex_to_rgb(COLORS['primaryLight']))
    draw_rounded_rect(draw,
        [32, input_y + 30, WIDTH - 140, input_y + 110],
        radius=40,
        fill=hex_to_rgb(COLORS['cardBg']))
    draw.text((72, input_y + 56), "Ask Mollie anything...",
              font=fonts['body'], fill=hex_to_rgb(COLORS['textSecondary']))

    # Send button
    draw.ellipse([WIDTH - 120, input_y + 30, WIDTH - 32, input_y + 110],
                 fill=hex_to_rgb(COLORS['accent']))

    img.save(os.path.join(output_dir, '04_mollie.png'), 'PNG')
    print("Created: 04_mollie.png")

def create_restaurant_detail(output_dir, fonts):
    """Create Restaurant Detail mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(COLORS['primary']))
    draw = ImageDraw.Draw(img)

    # Hero image area
    hero_height = 600
    draw.rectangle([0, 0, WIDTH, hero_height], fill=hex_to_rgb(COLORS['cardBgElevated']))

    # Gradient overlay
    for i in range(200):
        alpha = i / 200
        y = hero_height - 200 + i
        color = tuple(int(c * alpha) for c in hex_to_rgb(COLORS['primary']))
        draw.line([(0, y), (WIDTH, y)], fill=color)

    # Back button
    draw.ellipse([32, 80, 112, 160], fill=(0, 0, 0, 128))
    draw.text((56, 100), "<", font=fonts['heading'], fill=hex_to_rgb(COLORS['text']))

    # Share & Favorite buttons
    draw.ellipse([WIDTH - 200, 80, WIDTH - 120, 160], fill=(0, 0, 0, 128))
    draw.ellipse([WIDTH - 112, 80, WIDTH - 32, 160], fill=(0, 0, 0, 128))

    y = hero_height + 32

    # Restaurant name
    draw.text((32, y), "The Pressroom", font=fonts['title'], fill=hex_to_rgb(COLORS['text']))
    y += 80

    # Verified badge + categories
    draw.text((32, y), "✓ Verified", font=fonts['small'], fill=hex_to_rgb(COLORS['accent']))

    # Category badges
    badge_x = 200
    for cat in ["American", "Bar", "Dinner"]:
        cat_bbox = draw.textbbox((0, 0), cat, font=fonts['caption'])
        cat_width = cat_bbox[2] - cat_bbox[0] + 32

        draw_rounded_rect(draw,
            [badge_x, y - 4, badge_x + cat_width, y + 40],
            radius=RADIUS['xs'],
            fill=hex_to_rgb(COLORS['cardBgElevated']),
            outline=hex_to_rgb(COLORS['accent']),
            width=2)
        draw.text((badge_x + 16, y + 4), cat,
                  font=fonts['caption'], fill=hex_to_rgb(COLORS['textMuted']))
        badge_x += cat_width + 12
    y += 70

    # Quick actions bar
    actions = ["Call", "Directions", "Website", "Menu"]
    action_width = (WIDTH - 64) // 4
    for i, action in enumerate(actions):
        ax = 32 + i * action_width
        draw_rounded_rect(draw,
            [ax, y, ax + action_width - 16, y + 100],
            radius=RADIUS['md'],
            fill=hex_to_rgb(COLORS['cardBg']))

        # Icon circle
        draw.ellipse([ax + action_width//2 - 24, y + 16, ax + action_width//2 + 24, y + 64],
                     fill=hex_to_rgb(COLORS['accent']))

        action_bbox = draw.textbbox((0, 0), action, font=fonts['caption'])
        action_w = action_bbox[2] - action_bbox[0]
        draw.text((ax + action_width//2 - action_w//2 - 8, y + 72), action,
                  font=fonts['caption'], fill=hex_to_rgb(COLORS['textMuted']))
    y += 140

    # About section
    y = draw_section_header(draw, fonts, "About", None, y)
    draw.text((32, y), "Modern American restaurant in the",
              font=fonts['body'], fill=hex_to_rgb(COLORS['textMuted']))
    draw.text((32, y + 44), "heart of downtown Lancaster.",
              font=fonts['body'], fill=hex_to_rgb(COLORS['textMuted']))
    y += 120

    # Hours section
    y = draw_section_header(draw, fonts, "Hours", None, y)
    draw_rounded_rect(draw,
        [32, y, WIDTH - 32, y + 180],
        radius=RADIUS['md'],
        fill=hex_to_rgb(COLORS['cardBg']))

    hours = [("Monday - Thursday", "11am - 10pm"),
             ("Friday - Saturday", "11am - 11pm"),
             ("Sunday", "10am - 9pm")]
    hy = y + 24
    for day, time in hours:
        draw.text((60, hy), day, font=fonts['small'], fill=hex_to_rgb(COLORS['text']))
        draw.text((WIDTH - 280, hy), time, font=fonts['small'], fill=hex_to_rgb(COLORS['textMuted']))
        hy += 50

    img.save(os.path.join(output_dir, '05_detail.png'), 'PNG')
    print("Created: 05_detail.png")

def create_voting_screen(output_dir, fonts):
    """Create Voting/Leaderboard mockup"""
    img = Image.new('RGB', (WIDTH, HEIGHT), hex_to_rgb(COLORS['primary']))
    draw = ImageDraw.Draw(img)

    draw_status_bar(draw, fonts)
    draw_tab_bar(draw, fonts, 'Vote')

    y = 140

    # Header
    draw.text((32, y), "December 2024", font=fonts['section'], fill=hex_to_rgb(COLORS['textMuted']))
    y += 60
    draw.text((32, y), "Vote for Lancaster's Best", font=fonts['heading'], fill=hex_to_rgb(COLORS['text']))
    y += 80

    # Category tabs
    categories = ["Best Bar", "Best Brunch", "Best Date Spot"]
    cat_x = 32
    for i, cat in enumerate(categories):
        cat_bbox = draw.textbbox((0, 0), cat, font=fonts['small'])
        cat_width = cat_bbox[2] - cat_bbox[0] + 48

        is_selected = i == 0
        draw_rounded_rect(draw,
            [cat_x, y, cat_x + cat_width, y + 64],
            radius=32,
            fill=hex_to_rgb(COLORS['accent'] if is_selected else COLORS['cardBg']))
        draw.text((cat_x + 24, y + 16), cat,
                  font=fonts['small'], fill=hex_to_rgb(COLORS['text']))
        cat_x += cat_width + 16
    y += 100

    # Leaderboard
    y = draw_section_header(draw, fonts, "Current Rankings", None, y)
    y += 16

    rankings = [
        ("🥇", "Tellus360", "342 votes", True),
        ("🥈", "The Pressroom", "289 votes", False),
        ("🥉", "Horse Inn", "245 votes", False),
        ("4", "Annie Bailey's", "198 votes", False),
        ("5", "Luca", "156 votes", False),
    ]

    for rank, name, votes, is_leading in rankings:
        card_height = 120
        draw_rounded_rect(draw,
            [32, y, WIDTH - 32, y + card_height],
            radius=RADIUS['md'],
            fill=hex_to_rgb(COLORS['cardBg']),
            outline=hex_to_rgb(COLORS['accent']) if is_leading else None,
            width=3 if is_leading else 0)

        # Rank
        draw.text((60, y + 36), rank, font=fonts['heading'], fill=hex_to_rgb(COLORS['text']))

        # Name
        draw.text((140, y + 28), name, font=fonts['body'], fill=hex_to_rgb(COLORS['text']))
        draw.text((140, y + 72), votes, font=fonts['small'], fill=hex_to_rgb(COLORS['textMuted']))

        # Vote button
        if not is_leading:
            btn_x = WIDTH - 180
            draw_rounded_rect(draw,
                [btn_x, y + 30, btn_x + 120, y + 90],
                radius=RADIUS['sm'],
                fill=hex_to_rgb(COLORS['accent']))
            draw.text((btn_x + 30, y + 48), "Vote", font=fonts['small'], fill=hex_to_rgb(COLORS['text']))
        else:
            draw.text((WIDTH - 180, y + 48), "Leading!", font=fonts['small'], fill=hex_to_rgb(COLORS['accent']))

        y += card_height + 16

    img.save(os.path.join(output_dir, '06_voting.png'), 'PNG')
    print("Created: 06_voting.png")

def main():
    output_dir = '/Users/leandertoney/taste_lanc_app/assets/app-store-screenshots'
    os.makedirs(output_dir, exist_ok=True)

    fonts = load_fonts()

    print(f"Generating accurate App Store screenshots...")
    print(f"Size: {WIDTH} × {HEIGHT}px (iPhone 6.7\" display)")
    print(f"Using exact colors from TasteLanc design system")
    print()

    create_home_screen(output_dir, fonts)
    create_search_screen(output_dir, fonts)
    create_map_screen(output_dir, fonts)
    create_mollie_screen(output_dir, fonts)
    create_restaurant_detail(output_dir, fonts)
    create_voting_screen(output_dir, fonts)

    print()
    print(f"✅ All screenshots saved to: {output_dir}")

if __name__ == '__main__':
    main()
