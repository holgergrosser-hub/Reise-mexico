#!/bin/bash

echo "🇲🇽 Mexiko Reise 2025 - Netlify Deployment"
echo "=========================================="
echo ""

# Prüfen ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ist nicht installiert!"
    echo "Bitte installieren Sie Node.js von: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js Version: $(node --version)"
echo ""

# Dependencies installieren
echo "📦 Installiere Dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Installation fehlgeschlagen!"
    exit 1
fi

echo "✅ Dependencies installiert"
echo ""

# Projekt bauen
echo "🔨 Baue Projekt..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build fehlgeschlagen!"
    exit 1
fi

echo "✅ Projekt erfolgreich gebaut"
echo ""

# Netlify CLI prüfen
if ! command -v netlify &> /dev/null; then
    echo "⚠️  Netlify CLI nicht gefunden"
    echo ""
    echo "Möchten Sie Netlify CLI installieren? (j/n)"
    read -r response
    if [[ "$response" =~ ^([jJ][aA]|[jJ])$ ]]; then
        echo "📦 Installiere Netlify CLI global..."
        npm install -g netlify-cli
        echo "✅ Netlify CLI installiert"
    else
        echo ""
        echo "📋 Manuelle Deployment-Optionen:"
        echo ""
        echo "1. GitHub + Netlify (Empfohlen):"
        echo "   - Erstellen Sie ein GitHub Repository"
        echo "   - Push Sie den Code: git push origin main"
        echo "   - Verbinden Sie es mit Netlify: https://app.netlify.com"
        echo ""
        echo "2. Drag & Drop:"
        echo "   - Gehen Sie zu: https://app.netlify.com/drop"
        echo "   - Ziehen Sie den 'dist' Ordner auf die Seite"
        echo ""
        exit 0
    fi
fi

echo ""
echo "🚀 Deployment-Optionen:"
echo ""
echo "1. Automatisches Deployment (empfohlen)"
echo "2. Test-Deployment (Draft)"
echo "3. Abbrechen"
echo ""
echo "Ihre Wahl (1-3):"
read -r choice

case $choice in
    1)
        echo "🚀 Starte Produktiv-Deployment..."
        netlify deploy --prod
        ;;
    2)
        echo "🧪 Starte Test-Deployment..."
        netlify deploy
        ;;
    *)
        echo "❌ Deployment abgebrochen"
        exit 0
        ;;
esac

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🎉 Ihre Mexiko-Reise-Karte ist jetzt online!"
