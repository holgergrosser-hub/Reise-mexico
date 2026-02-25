# 🇲🇽 Mexiko Reise 2025 - Interaktive Reiseplanung

[![Netlify Status](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify)](https://netlify.com)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)
[![Google Apps Script](https://img.shields.io/badge/Backend-Google_Apps_Script-4285F4?style=for-the-badge&logo=google)](https://script.google.com)

Vollständige interaktive Webapplikation für eine 3-wöchige Mexiko-Rundreise mit **Cloud-Sync für Teams**!

![Screenshot Placeholder](https://via.placeholder.com/1200x600/667eea/ffffff?text=Mexiko+Reise+2025)

## ✨ Features

### 🗺️ Interaktive Karte
- Google Maps mit allen 60+ Orten
- Farbcodierte Marker (Mexiko-Stadt, Ausflüge, Karibik)
- Klickbare Infos mit Fahrzeiten & Entfernungen
- Route-Visualisierung

### 📅 Timeline-Ansicht
- Chronologischer Zeitplan aller 22 Reisetage
- Detaillierte Zeitangaben für jeden Ort
- Vorschau gespeicherter Notizen

### 📝 Interaktive Notizen
- Notizen zu jedem Reisetag
- Ideal für Buchungen, Ideen, Restaurant-Reservierungen
- Export als Textdatei

### 📄 Bearbeitbares Dokument
- Vollständiger Original-Reiseplan (187 Absätze)
- **Lese-Modus:** Übersichtliche Darstellung
- **Bearbeitungs-Modus:** Direkt im Browser bearbeiten
- Perfekt für Team-Kommentare, Buchungsbestätigungen, etc.

### ☁️ Cloud-Sync (Optional)
- **Multi-User Collaboration** via Google Apps Script
- Automatische Synchronisation alle 30 Sekunden
- Echtzeit-Updates für alle Teammitglieder
- Offline-Modus mit lokalem Backup
- Umschaltbar: Cloud ☁️ oder Lokal 💻

## 🚀 Schnellstart

### 1. Repository klonen

```bash
git clone https://github.com/IHR-USERNAME/mexiko-reise-2025.git
cd mexiko-reise-2025
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Lokal starten

```bash
npm run dev
```

Öffnen Sie http://localhost:5173

### 4. Auf Netlify deployen

**Option A: GitHub Integration (Empfohlen)**
1. Push zu GitHub
2. Auf Netlify.com → "Add new site" → "Import from GitHub"
3. Repository auswählen
4. Deploy! (Konfiguration wird aus `netlify.toml` gelesen)

**Option B: Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## ☁️ Cloud-Sync Setup (Optional)

Für **Team-Collaboration** siehe detaillierte Anleitung:
📖 **[CLOUD-SYNC-SETUP.md](./CLOUD-SYNC-SETUP.md)**

**Kurzversion:**
1. Google Sheet erstellen
2. Google Apps Script deployen (`/google-apps-script/Code.gs`)
3. Apps-Script URL als Env-Var setzen: `VITE_APPS_SCRIPT_URL` (z.B. in Netlify)
4. Fertig!

**Ohne Cloud-Sync:** App funktioniert im lokalen Modus (nur Browser-Speicher)

## 📁 Projektstruktur

```
mexiko-reise/
├── public/
│   └── Reiseplan_Mexiko__1_.docx    # Original Word-Dokument
├── src/
│   ├── App.jsx                      # Haupt-Komponente
│   ├── App.css                      # Styling
│   ├── main.jsx                     # Entry Point
│   ├── cloudAPI.js                  # Cloud-Sync API
│   └── reiseplan-text.json          # Extrahierter Text
├── google-apps-script/
│   └── Code.gs                      # Backend für Cloud-Sync
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml                     # Netlify Config
├── README.md                        # Diese Datei
├── CLOUD-SYNC-SETUP.md              # Cloud Setup
└── SCHNELLSTART.md                  # Deployment Guide
```

## 🛠️ Technologie-Stack

- **Frontend:** React 18.2 + Vite
- **Maps:** Google Maps JavaScript API
- **Styling:** Pure CSS (responsive)
- **Backend (optional):** Google Apps Script
- **Storage:** LocalStorage + Google Sheets
- **Hosting:** Netlify

## 📊 Reise-Details

- **Dauer:** 23 Tage (09.04 - 01.05.2025)
- **Route:** Mexiko-Stadt (12 Tage) → Karibik (9 Tage)
- **Orte:** 60+ Locations
- **Distanz:** ~1.800 km (ohne Flüge)
- **Tagesausflüge:** Tula, Teotihuacán, Taxco, Sian Ka'an

## 🔧 Entwicklung

### Lokaler Dev-Server
```bash
npm run dev
```

### Build erstellen
```bash
npm run build
```

### Preview (nach Build)
```bash
npm run preview
```

### Linting / Formatting
Projekt nutzt Standard ESLint Config von Vite/React

## 📝 Anpassungen

### Bilder (Fotos) hinzufügen

- Bilder als Dateien ablegen: `public/bilder/…` (z.B. `public/bilder/roma-1.jpg`)
- In der App werden sie über Pfade wie `/bilder/roma-1.jpg` geladen
- Zuordnung erfolgt in `src/subpointImages.js` über einen normalisierten Key (klein, ohne Akzente)
- Die Bilder werden im **Detaillierten Reiseplan** unter passenden Orten/Unterpunkten angezeigt

### Google Maps API Key
Die App nutzt `VITE_GOOGLE_MAPS_API_KEY` (Environment Variable). Für Production:
1. Erstellen Sie einen eigenen Key: https://console.cloud.google.com
2. Setzen Sie `VITE_GOOGLE_MAPS_API_KEY` (z.B. in Netlify)
3. Beschränken Sie den Key auf Ihre Domain (HTTP referrers)

### Farben & Design
Hauptfarben in `src/App.css`:
- Primär: `#667eea` (Lila)
- Mexiko-Stadt: `#E63946` (Rot)
- Ausflüge: `#F77F00` (Orange)
- Karibik: `#06D6A0` (Grün)

## 🐛 Troubleshooting

### "vite: not found" beim Netlify Build
→ Bereits gelöst durch `netlify.toml` (npm install && npm run build)

### "terser: not found"
→ Bereits gelöst durch `vite.config.js` (minify: 'esbuild')

### Cloud-Sync funktioniert nicht
→ Siehe [CLOUD-SYNC-SETUP.md](./CLOUD-SYNC-SETUP.md) Troubleshooting-Sektion

### Karte lädt nicht
→ Prüfen Sie Browser Console (F12) auf API Key Fehler

### Places-Fotos funktionieren nicht (`ApiTargetBlockedMapError` / `REQUEST_DENIED`)

Wenn in der Browser-Console z.B. `Places API error: ApiTargetBlockedMapError` oder im Popup `Places: REQUEST_DENIED` steht, blockiert der **API-Key** den Zugriff auf die **Places API**.

Fix in Google Cloud Console:
1. **Billing aktivieren**: Projekt muss ein aktives Billing-Konto haben.
2. **APIs aktivieren**: `APIs & Services` → `Enabled APIs` → mindestens
	 - **Maps JavaScript API**
	 - **Places API** (ggf. zusätzlich **Places API (New)**)
3. **API-Key Restrictions prüfen**: `APIs & Services` → `Credentials` → API Key
	 - Application restrictions: `HTTP referrers (web sites)`
		 - `https://<deine-netlify-site>.netlify.app/*`
		 - ggf. Custom Domain: `https://<deine-domain>/*`
		 - optional lokal: `http://localhost:5173/*`
	 - API restrictions:
		 - entweder testweise kurz `Don't restrict key` (nur zum Debug)
		 - oder erlauben: **Maps JavaScript API** + **Places API**

Hinweis: Ein API-Key ist im Browser immer sichtbar (Client-side). Nutze deshalb immer Referrer-Restriktionen und rotiere den Key, falls er versehentlich geteilt wurde.

## 📄 Lizenz

Privates Projekt für persönliche Reiseplanung.

## 👥 Mitwirkende

- **Holger Grosser** - Hauptreisender & Entwickler
- **Anabel** - Co-Reisende

## 🙏 Credits

- Google Maps für Kartendarstellung
- Anthropic Claude für Entwicklungsunterstützung
- Netlify für kostenloses Hosting

---

**Viel Spaß in Mexiko! 🌮🏖️🎉**

Made with ❤️ for the perfect Mexico adventure
