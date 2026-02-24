#!/bin/bash

# ============================================
# GIT & GITHUB SETUP FÜR MEXIKO REISE 2025
# ============================================

echo "🚀 Git Repository Setup für Mexiko Reise 2025"
echo "=============================================="
echo ""

# Prüfen ob Git installiert ist
if ! command -v git &> /dev/null; then
    echo "❌ Git ist nicht installiert!"
    echo "Bitte installieren Sie Git von: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git ist installiert: $(git --version)"
echo ""

# Git Repository initialisieren
echo "📦 Initialisiere Git Repository..."
git init

if [ $? -ne 0 ]; then
    echo "❌ Git init fehlgeschlagen!"
    exit 1
fi

echo "✅ Git Repository initialisiert"
echo ""

# .gitignore prüfen
if [ ! -f .gitignore ]; then
    echo "⚠️  .gitignore nicht gefunden, erstelle..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build output
dist/
.netlify/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
EOF
fi

echo "✅ .gitignore vorhanden"
echo ""

# Alle Dateien hinzufügen
echo "📝 Füge alle Dateien hinzu..."
git add .

if [ $? -ne 0 ]; then
    echo "❌ git add fehlgeschlagen!"
    exit 1
fi

echo "✅ Dateien hinzugefügt"
echo ""

# Initial Commit
echo "💾 Erstelle Initial Commit..."
git commit -m "Initial commit: Mexiko Reise 2025 - Interaktive Reiseplanung

- React App mit Google Maps
- 4 Tabs: Karte, Timeline, Notizen, Dokument
- Cloud-Sync für Multi-User (optional)
- 60+ Orte mit Fahrzeiten
- Bearbeitbares Dokument
- Export-Funktionen
- Netlify-ready"

if [ $? -ne 0 ]; then
    echo "❌ git commit fehlgeschlagen!"
    exit 1
fi

echo "✅ Initial Commit erstellt"
echo ""

# Branch auf main umbenennen (falls nötig)
git branch -M main

echo "=============================================="
echo "✅ Git Repository erfolgreich eingerichtet!"
echo "=============================================="
echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo ""
echo "1️⃣  GitHub Repository erstellen:"
echo "   → Gehen Sie zu: https://github.com/new"
echo "   → Repository Name: mexiko-reise-2025"
echo "   → Erstellen Sie das Repository (OHNE README/gitignore)"
echo ""
echo "2️⃣  Remote hinzufügen:"
echo "   → Ersetzen Sie IHR-USERNAME mit Ihrem GitHub Benutzernamen:"
echo ""
echo "   git remote add origin https://github.com/IHR-USERNAME/mexiko-reise-2025.git"
echo ""
echo "3️⃣  Push zum GitHub:"
echo ""
echo "   git push -u origin main"
echo ""
echo "4️⃣  Auf Netlify deployen:"
echo "   → Gehen Sie zu: https://app.netlify.com"
echo "   → 'Add new site' → 'Import from GitHub'"
echo "   → Wählen Sie Ihr Repository"
echo "   → Deploy!"
echo ""
echo "=============================================="
echo ""
echo "💡 TIPP: Kopieren Sie GITHUB-README.md als README.md nach GitHub:"
echo "   cp GITHUB-README.md README.md"
echo "   git add README.md"
echo "   git commit -m 'Add README for GitHub'"
echo "   git push"
echo ""
