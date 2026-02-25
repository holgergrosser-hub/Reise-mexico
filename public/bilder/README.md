# Bilder

Lege eure Bilddateien (JPG/PNG/WebP) in diesen Ordner.

Die App lädt sie dann über Pfade wie:
- `/bilder/mein-foto.jpg`

## Verknüpfung mit Orten/Unterpunkten

1. Datei hier ablegen (z.B. `public/bilder/casa-azul-1.jpg`)
2. In `src/subpointImages.js` den passenden Eintrag ergänzen.

Der Key ist **normalisiert** (klein, ohne Akzente, Sonderzeichen entfernt).
Beispiel:

```js
export const SUBPOINT_IMAGES = {
  "casa azul frida kahlo museum": [
    "/bilder/casa-azul-1.jpg",
    "/bilder/casa-azul-2.jpg",
  ],
};
```

Tipp: Der Key sollte zum angezeigten Ort/Unterpunkt passen (z.B. "Casa Azul (Frida Kahlo Museum)").
