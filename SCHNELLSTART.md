# 🚀 SCHNELLSTART - In 5 Minuten auf Netlify

## ⚡ Schnellste Methode (GitHub + Netlify)

### Schritt 1: GitHub Repository erstellen
1. Gehen Sie zu: https://github.com/new
2. Repository Name: `mexiko-reise-2025`
3. Klicken Sie "Create repository"

### Schritt 2: Code hochladen
Öffnen Sie ein Terminal in diesem Ordner und führen Sie aus:

```bash
git init
git add .
git commit -m "Mexiko Reiseplan 2025"
git branch -M main
git remote add origin https://github.com/IHR-USERNAME/mexiko-reise-2025.git
git push -u origin main
```

**Wichtig**: Ersetzen Sie `IHR-USERNAME` mit Ihrem GitHub Benutzernamen!

### Schritt 3: Mit Netlify verbinden
1. Gehen Sie zu: https://app.netlify.com
2. Klicken Sie "Add new site" → "Import an existing project"
3. Wählen Sie "GitHub"
4. Wählen Sie Ihr Repository `mexiko-reise-2025`
5. Klicken Sie "Deploy site"

### Schritt 4: Fertig! 🎉
- Nach 2-3 Minuten ist Ihre Seite live
- URL: `https://zufallsname-123.netlify.app`
- Sie können den Namen unter "Site settings" ändern

---

## 🎨 Alternative: Drag & Drop (Noch schneller!)

### Schritt 1: Projekt bauen
```bash
npm install
npm run build
```

### Schritt 2: Deployen
1. Gehen Sie zu: https://app.netlify.com/drop
2. Ziehen Sie den `dist` Ordner auf die Webseite
3. Fertig! 🎉

---

## 🛠️ Mit Deploy-Script (Linux/Mac)

```bash
chmod +x deploy.sh
./deploy.sh
```

Das Script führt Sie durch den gesamten Prozess.

---

## ❓ Probleme?

### "vite: not found" beim Deployment
→ Ist bereits behoben durch `netlify.toml` Konfiguration

### "terser not found"
→ Ist bereits behoben durch `vite.config.js` (esbuild)

### Karte wird nicht angezeigt
→ Prüfen Sie die Browser-Console (F12)
→ Google Maps API Key ist öffentlich, sollte funktionieren

### Builds schlagen fehl
→ Stellen Sie sicher dass `netlify.toml` vorhanden ist
→ Node Version sollte 18 sein (wird automatisch gesetzt)

---

## 📱 Nach dem Deployment

Ihre Webseite enthält:
- ✅ Interaktive Google Maps mit allen 60+ Orten
- ✅ Detaillierte Timeline mit allen 22 Reisetagen
- ✅ Fahrzeiten und Entfernungen
- ✅ Farbcodierte Marker (Mexiko-Stadt, Ausflüge, Karibik)
- ✅ Responsive Design (Desktop + Mobile)

---

## 🖼️ Bilder hinzufügen

1. Bilder (JPG/PNG/WebP) in `public/bilder/` ablegen
2. Zuordnung in `src/subpointImages.js` ergänzen (Key = normalisierter Ort/Unterpunkt)
3. Deployen – die Bilder erscheinen im **Detaillierten Reiseplan** unter passenden Orten/Unterpunkten

---

## 🔗 Nützliche Links

- Netlify Dashboard: https://app.netlify.com
- GitHub: https://github.com
- Google Maps API Console: https://console.cloud.google.com

---

Viel Spaß in Mexiko! 🇲🇽🌮🏖️
