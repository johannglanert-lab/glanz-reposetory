# Glanz Design – Website

Live-Website von **Glanz Design** – Webdesign-Agentur aus Köln.

**Stack:** Statisches HTML/CSS/JS (kein Build-Schritt)
**Hosting:** Hostinger via Git Auto-Deploy

## Struktur

```
.
├── index.html        # Startseite
├── leistungen.html   # Leistungen
├── projekte.html     # Referenzen
├── termin.html       # Kontakt / Termin
├── legal/            # Impressum, Datenschutz, AGB
└── assets/
    ├── css/main.css
    ├── js/
    └── images/
```

## Deployment

Änderungen werden automatisch auf die Live-Website übertragen:

```bash
git add .
git commit -m "Beschreibung der Änderung"
git push
```

Hostinger zieht die neue Version innerhalb weniger Sekunden nach `public_html/`.

## Lokal entwickeln

```bash
node _serve.js
# http://localhost:8000
```
