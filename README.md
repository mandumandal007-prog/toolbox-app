# 🧰 ToolBox — 119 PDF, Photo, Text & Calculator Tools (Android APK)

Ek complete **Material Design 3** tool app — 110+ tools (PDF + Photo + Text + Calculator).
Sab kuch **HTML/CSS/JS** me hai aur **Capacitor** se Android APK banti hai.
GitHub par push karo → APK automatically ban jayegi (GitHub Actions).

---

## ✨ Features

- **PDF Tools (~20):** Merge, Split, Extract, Delete, Rotate, Reorder, Reverse, Images→PDF, PDF→Images, PDF→Text, Watermark, Page Numbers, Metadata, Info, Blank Page, Crop, Resize A4, Compress, Header/Footer
- **Photo Tools (~50):** Grayscale, Sepia, Invert, Blur, Brightness, Contrast, Saturation, Hue, Vintage, Warm/Cool, Sharpen, Posterize, Threshold, Pixelate, Noise, Emboss, Edge, Duotone, Vignette, Tint, Solarize, Noir, Resize, Crop, Rotate, Flip, Round Corners, Circle Crop, Border, Padding, Compress, Convert, Thumbnail, Passport Photo, Watermark, Add Text, Meme, Polaroid, Mirror, Background Fill, Image Info, Base64, Color Picker, Favicon Pack, Collage, Merge, Split Grid, Contact Sheet, QR Code
- **Text & Utility (~40):** Word Counter, Case Converter, Find & Replace, Dedupe, Sort, Trim, Reverse, Slugify, Base64, URL Encode, JSON Format, CSV↔JSON, Markdown Preview, Hash (SHA), UUID, Password, Lorem, Number→Words, Roman, Base Converter, Morse, Diff, Emails, URLs, Spaces
- **Calculators (~12):** EMI, SIP, GST, Percentage, Age, BMI, Date Diff, Length, Weight, Temperature, Random, Tip

---

## 🚀 APK kaise banayein (2 tarike)

### Tarika 1 — GitHub Actions (sabse aasan, phone se bhi)
1. GitHub par naya repo banao.
2. Is folder ke **saare files** upload karo (`.github` folder bhi — hidden folder hai).
3. Repo → **Actions** tab → **Build APK** → **Run workflow**.
4. 5–8 minute baad **Artifacts** me `toolbox-apk` download karo (ya Releases me `toolbox.apk`). Bas! 🎉

### Tarika 2 — Apne PC par
```bash
npm install
npx cap add android
npx cap sync android
npx cap open android     # Android Studio khulega → Run ▶
```

Ya sirf APK:

```
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔧 Customization

| Kya badalna hai ↕▾ | Kahan ↕▾ |
|---|---|
| −App ka naam | `capacitor.config.json` → `appName` |
| −Package ID | `capacitor.config.json` → `appId` |
| −Theme color | `www/css/style.css` → `:root` variables |
| −Naya tool | `www/js/tools/*.js` me `tool({...})` add karo |
⚙

---

## ⚠️ Note

PDF engine (`pdf-lib`, `pdf.js`), ZIP (`jszip`), QR (`qrcode-generator`) aur barcode (`jsbarcode`)
`npm install` ke time `www/vendor/` me copy ho jate hain — app **100% offline** chalti hai.
Saved files phone ke **Documents/ToolBox** folder me jaati hain (Share button bhi milta hai).

Latest APK: repo ke **Releases** section me `toolbox.apk`.

## 📄 License

MIT — free to use, modify, publish.
