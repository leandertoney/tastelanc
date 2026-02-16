# TasteLanc App - Asset Requirements

## Required Assets for App Store Submission

### App Icon (Required)

| Platform | File | Size | Notes |
|----------|------|------|-------|
| iOS | `assets/icon.png` | 1024x1024 | No transparency, no rounded corners (iOS adds them) |
| Android | `assets/adaptive-icon.png` | 1024x1024 | Foreground image for adaptive icon |
| Web | `assets/favicon.png` | 48x48 | Browser tab icon |

### Splash Screen

| File | Size | Notes |
|------|------|-------|
| `assets/splash-icon.png` | 1284x2778 | Full splash screen image |

**Splash Configuration:**
- Background color: `#A41E22` (TasteLanc Red)
- Resize mode: `contain`

### Android Adaptive Icon

The adaptive icon requires:
1. **Foreground** (`adaptive-icon.png`): Your logo/icon with transparent background
2. **Background**: Set in `app.json` as `#A41E22`

The foreground image should be centered and occupy ~66% of the safe zone.

---

## App Store Screenshots (For Submission)

### iOS Screenshots Required

| Device | Size |
|--------|------|
| iPhone 6.7" | 1290x2796 |
| iPhone 6.5" | 1284x2778 |
| iPhone 5.5" | 1242x2208 |
| iPad Pro 12.9" | 2048x2732 |

### Android Screenshots Required

| Type | Size |
|------|------|
| Phone | 1080x1920 (min) |
| 7" Tablet | 1200x1920 |
| 10" Tablet | 1600x2560 |

---

## App Store Listing Requirements

### iOS App Store

- **App Name**: TasteLanc (max 30 characters)
- **Subtitle**: Discover Lancaster's Best Eats (max 30 characters)
- **Keywords**: lancaster, restaurants, food, dining, happy hour, bars, specials
- **Description**: 4000 characters max
- **Privacy Policy URL**: Required
- **Support URL**: Required
- **Age Rating**: 4+ (no objectionable content)

### Google Play Store

- **App Name**: TasteLanc - Lancaster Dining (max 50 characters)
- **Short Description**: Discover Lancaster's best restaurants & deals (max 80 characters)
- **Full Description**: 4000 characters max
- **Feature Graphic**: 1024x500 PNG or JPEG
- **Privacy Policy URL**: Required
- **Content Rating**: Everyone

---

## Design Specifications

### Brand Colors
```
Primary (Red): #A41E22
Accent (Green): #2E7D32
Text (White): #FFFFFF
Text Muted: rgba(255,255,255,0.8)
Error: #D32F2F
```

### Typography
- Headers: System font, bold (700)
- Body: System font, regular (400)
- Buttons: System font, semibold (600)

### Icon Style
- Use filled icons for active states
- Use outline icons for inactive states
- Icon library: @expo/vector-icons (Ionicons)

---

## Checklist Before Submission

### iOS
- [ ] App icon (1024x1024, no transparency)
- [ ] Launch screen configured
- [ ] Privacy descriptions in Info.plist
- [ ] Bundle identifier matches Apple Developer account
- [ ] App Store screenshots (all required sizes)
- [ ] App preview video (optional)
- [ ] Privacy policy URL
- [ ] Support URL

### Android
- [ ] Adaptive icon (foreground + background)
- [ ] Feature graphic (1024x500)
- [ ] Google Play screenshots
- [ ] Privacy policy URL
- [ ] Content rating questionnaire completed
- [ ] Signing key generated (EAS handles this)

---

## Asset Generation Tools

Recommended tools for generating assets:

1. **App Icon Generator**: https://appicon.co/
2. **Splash Screen Generator**: https://apetools.webprofusion.com/app/
3. **Screenshot Mockups**: https://mockuphone.com/
4. **Figma**: For custom designs

### Using Expo CLI

```bash
# Generate app icons from a single source
npx expo-optimize

# Preview splash screen
npx expo start
```

---

## Current Placeholder Assets

The following assets are placeholders and need to be replaced:

- `assets/icon.png` - Replace with TasteLanc logo
- `assets/adaptive-icon.png` - Replace with TasteLanc logo (transparent)
- `assets/splash-icon.png` - Replace with branded splash
- `assets/favicon.png` - Replace with small TasteLanc icon
