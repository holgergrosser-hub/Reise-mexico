import React, { useMemo, useState, useEffect } from 'react';
import './App.css';
import reiseplanData from './reiseplan-text.json';
import CloudAPI from './cloudAPI';
import WeatherAPI from './weatherAPI';
import { SUBPOINT_IMAGES } from './subpointImages';

function App() {
  const [selectedDay, setSelectedDay] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [notes, setNotes] = useState({});
  const [activeTab, setActiveTab] = useState('karte');
  const [editedDocument, setEditedDocument] = useState(reiseplanData.paragraphs);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [filteredDay, setFilteredDay] = useState(null); // Für Kartenfilter

  // Cache für automatisch gefundene Orte (Google Places)
  const [placeCache, setPlaceCache] = useState(() => {
    try {
      const raw = localStorage.getItem('mexiko-place-cache-v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  
  // Cloud-Sync States
  const [cloudAPI] = useState(() => new CloudAPI());
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncMode, setSyncMode] = useState(() => {
    return localStorage.getItem('sync-mode') || 'cloud'; // 'cloud' oder 'local'
  });

  // Wetter States
  const [weatherAPI] = useState(() => new WeatherAPI());
  const [currentWeather, setCurrentWeather] = useState(null);
  const [tulumWeather, setTulumWeather] = useState(null);
  const [playaWeather, setPlayaWeather] = useState(null);
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Initialer Sync beim Start
  useEffect(() => {
    const initSync = async () => {
      // Immer erst lokales Backup laden, damit nichts "verschwindet",
      // falls Cloud-Sync (temporär) fehlschlägt.
      loadLocalData();

      if (syncMode === 'cloud') {
        const online = await cloudAPI.checkConnection();
        setIsOnline(online);
        if (online) await syncFromCloud();
      } else {
        // local-only: bereits geladen
      }
    };
    
    initSync();
  }, [syncMode]);

  // Auto-Sync alle 30 Sekunden (mit aktuellem Online-Status)
  useEffect(() => {
    if (syncMode !== 'cloud' || !isOnline) return;
    const interval = setInterval(() => {
      syncFromCloud();
    }, 30000);
    return () => clearInterval(interval);
  }, [syncMode, isOnline]);

  // Lokale Daten laden
  const loadLocalData = () => {
    const savedNotes = localStorage.getItem('mexiko-reise-notizen');
    if (savedNotes) {
      try {
        setNotes(normalizeNotesForUI(JSON.parse(savedNotes)));
      } catch (e) {
        console.warn('Lokale Notizen konnten nicht gelesen werden:', e);
      }
    }
    
    const savedDoc = localStorage.getItem('mexiko-reise-dokument');
    if (savedDoc) setEditedDocument(JSON.parse(savedDoc));
  };

  const NOTE_FIELDS = ['freeText', 'tickets', 'treffpunkt', 'mitbringen', 'kosten', 'links'];
  const makeEmptyNote = () => ({
    freeText: '',
    tickets: '',
    treffpunkt: '',
    mitbringen: '',
    kosten: '',
    links: ''
  });

  const coerceNoteObject = (value) => {
    const empty = makeEmptyNote();

    // Raw string: entweder JSON oder Freitext
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            const hasAnyField = NOTE_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(parsed, f));
            if (hasAnyField) {
              const out = { ...empty };
              NOTE_FIELDS.forEach((f) => {
                if (parsed[f] != null) out[f] = String(parsed[f]);
              });
              return out;
            }
          }
        } catch {
          // ignore
        }
      }

      return { ...empty, freeText: value };
    }

    // Cloud shape: { text, user, timestamp }
    if (value && typeof value === 'object') {
      const textMaybe = value.text ?? value.note;
      if (typeof textMaybe === 'string') return coerceNoteObject(textMaybe);

      // Already structured object
      const hasAnyField = NOTE_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(value, f));
      if (hasAnyField) {
        const out = { ...empty };
        NOTE_FIELDS.forEach((f) => {
          if (value[f] != null) out[f] = String(value[f]);
        });
        return out;
      }
    }

    return empty;
  };

  const normalizeNotesForUI = (rawNotes) => {
    const normalized = {};
    if (!rawNotes || typeof rawNotes !== 'object') return normalized;

    Object.entries(rawNotes).forEach(([rawKey, rawValue]) => {
      const keyString = String(rawKey);
      const numberMatch = keyString.match(/\d+/);
      const dayKey = numberMatch ? String(parseInt(numberMatch[0], 10)) : keyString;
      normalized[dayKey] = coerceNoteObject(rawValue);
    });

    return normalized;
  };

  // Von Cloud synchronisieren
  const syncFromCloud = async () => {
    try {
      setIsSyncing(true);
      const data = await cloudAPI.syncAll();
      
      if (data.status === 'success') {
        // Notizen aktualisieren
        if (data.notes) {
          setNotes(normalizeNotesForUI(data.notes));
        }
        
        // Dokument aktualisieren
        if (data.document && data.document.length > 0) {
          setEditedDocument(data.document);
        }
        
        setLastSync(new Date());
        setIsOnline(true);
      } else {
        console.warn('Sync nicht erfolgreich:', data);
        setIsOnline(false);
      }
    } catch (error) {
      console.error('Sync Fehler:', error);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // Notizen speichern wenn sie sich ändern
  useEffect(() => {
    // Lokales Backup
    localStorage.setItem('mexiko-reise-notizen', JSON.stringify(notes));
  }, [notes]);

  // Bearbeitetes Dokument speichern
  useEffect(() => {
    // Lokales Backup
    localStorage.setItem('mexiko-reise-dokument', JSON.stringify(editedDocument));
  }, [editedDocument]);

  useEffect(() => {
    try {
      localStorage.setItem('mexiko-place-cache-v1', JSON.stringify(placeCache));
    } catch {
      // ignore
    }
  }, [placeCache]);

  // Sync-Modus wechseln
  const toggleSyncMode = () => {
    const newMode = syncMode === 'cloud' ? 'local' : 'cloud';
    setSyncMode(newMode);
    localStorage.setItem('sync-mode', newMode);
    
    if (newMode === 'cloud') {
      syncFromCloud();
    }
  };

  const updateNote = async (day, text) => {
    const dayKey = String(day);
    const nextNote = { ...makeEmptyNote(), ...(notes?.[dayKey] || {}), freeText: text };

    setNotes(prev => ({
      ...prev,
      [dayKey]: nextNote
    }));

    if (syncMode === 'cloud') {
      const payload = JSON.stringify(nextNote);
      const result = await cloudAPI.saveNote(dayKey, payload);
      if (result?.status === 'success') setIsOnline(true);
      if (result?.status === 'error') setIsOnline(false);
    }
  };

  const updateNoteField = async (day, field, value) => {
    const dayKey = String(day);
    if (!NOTE_FIELDS.includes(field)) return;

    const nextNote = { ...makeEmptyNote(), ...(notes?.[dayKey] || {}), [field]: value };
    setNotes(prev => ({
      ...prev,
      [dayKey]: nextNote
    }));

    if (syncMode === 'cloud') {
      const payload = JSON.stringify(nextNote);
      const result = await cloudAPI.saveNote(dayKey, payload);
      if (result?.status === 'success') setIsOnline(true);
      if (result?.status === 'error') setIsOnline(false);
    }
  };

  const hasNoteContent = (noteObj) => {
    if (!noteObj || typeof noteObj !== 'object') return false;
    return NOTE_FIELDS.some((f) => String(noteObj?.[f] || '').trim().length > 0);
  };

  const notesCount = useMemo(() => {
    return Object.values(notes || {}).filter(hasNoteContent).length;
  }, [notes]);

  const getNotePreviewText = (noteObj) => {
    const n = coerceNoteObject(noteObj);
    if (String(n.freeText || '').trim()) return n.freeText;
    if (String(n.treffpunkt || '').trim()) return `Treffpunkt: ${n.treffpunkt}`;
    if (String(n.tickets || '').trim()) return `Tickets: ${n.tickets}`;
    if (String(n.links || '').trim()) return `Links: ${n.links}`;
    if (String(n.mitbringen || '').trim()) return `Mitbringen: ${n.mitbringen}`;
    if (String(n.kosten || '').trim()) return `Kosten: ${n.kosten}`;
    return '';
  };

  const exportNotes = () => {
    const text = reiseDaten
      .map((tag) => {
        const dayKey = String(tag.tag);
        const noteObj = coerceNoteObject(notes?.[dayKey]);
        if (!hasNoteContent(noteObj)) return '';

        const lines = [];
        if (noteObj.tickets?.trim()) lines.push(`Tickets/Reservierung: ${noteObj.tickets.trim()}`);
        if (noteObj.treffpunkt?.trim()) lines.push(`Treffpunkt: ${noteObj.treffpunkt.trim()}`);
        if (noteObj.mitbringen?.trim()) lines.push(`Mitbringen: ${noteObj.mitbringen.trim()}`);
        if (noteObj.kosten?.trim()) lines.push(`Kosten: ${noteObj.kosten.trim()}`);
        if (noteObj.links?.trim()) lines.push(`Links: ${noteObj.links.trim()}`);
        if (noteObj.freeText?.trim()) lines.push(`Notizen:\n${noteObj.freeText.trim()}`);

        return `Tag ${tag.tag} - ${tag.datum} - ${tag.title}\n${lines.join('\n')}\n\n`;
      })
      .filter(Boolean)
      .join('---\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mexiko-reise-notizen.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const todayInfo = useMemo(() => {
    const TRAVEL_YEAR = 2025;
    if (!Array.isArray(reiseDaten) || reiseDaten.length === 0) return null;

    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const todayKey = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}`;

    const parseDatum = (datum) => {
      const match = String(datum || '').match(/^(\d{2})\.(\d{2})$/);
      if (!match) return null;
      const dd = parseInt(match[1], 10);
      const mm = parseInt(match[2], 10);
      return new Date(TRAVEL_YEAR, mm - 1, dd);
    };

    const schedule = reiseDaten
      .map((t) => ({
        tag: t,
        dateObj: parseDatum(t?.datum)
      }))
      .filter((x) => x.dateObj instanceof Date && !Number.isNaN(x.dateObj.valueOf()))
      .sort((a, b) => a.dateObj - b.dateObj);

    const exact = reiseDaten.find((t) => t?.datum === todayKey) || null;
    const nowInTravelYear = new Date(TRAVEL_YEAR, now.getMonth(), now.getDate());
    const nextUpcoming = schedule.find((x) => x.dateObj >= nowInTravelYear)?.tag || schedule[0]?.tag || null;

    const tag = exact || nextUpcoming;
    if (!tag) return null;

    const isToday = tag?.datum === todayKey;
    const parseTimeToMinutes = (timeText) => {
      const m = String(timeText || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      return hh * 60 + mm;
    };

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const orte = Array.isArray(tag?.orte) ? tag.orte : [];
    let nextOrt = orte[0] || null;
    if (isToday && orte.length > 0) {
      nextOrt = orte.find((o) => {
        const mins = parseTimeToMinutes(o?.zeit);
        return mins != null && mins >= nowMinutes;
      }) || orte[orte.length - 1];
    }

    const noteObj = coerceNoteObject(notes?.[String(tag.tag)]);
    const meeting = String(noteObj?.treffpunkt || '').trim() || String(nextOrt?.name || '').trim();

    return {
      tag,
      nextOrt,
      meeting,
      noteObj,
      isToday
    };
  }, [reiseDaten, notes]);

  const updateDocumentParagraph = (index, text) => {
    setEditedDocument(prev => {
      const newDoc = [...prev];
      newDoc[index] = text;
      return newDoc;
    });
  };

  const saveDocumentToCloud = async () => {
    if (syncMode === 'cloud') {
      setIsSyncing(true);
      const result = await cloudAPI.saveDocument(editedDocument);
      setIsSyncing(false);
      
      if (result.status === 'success') {
        setIsOnline(true);
        alert('✅ Dokument in Cloud gespeichert!');
      } else {
        setIsOnline(false);
        alert('❌ Fehler beim Speichern: ' + result.message);
      }
    }
  };

  const resetDocument = () => {
    if (confirm('Möchten Sie wirklich alle Änderungen zurücksetzen?')) {
      setEditedDocument(reiseplanData.paragraphs);
      localStorage.removeItem('mexiko-reise-dokument');
    }
  };

  const exportDocument = () => {
    const text = editedDocument.join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mexiko-reiseplan-bearbeitet.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const planByDate = useMemo(() => {
    const byDate = {};
    let currentDate = null;
    let currentSection = null;

    const ensureDate = (date) => {
      if (!byDate[date]) {
        byDate[date] = {
          sections: [],
          byStartTime: {},
          unassigned: []
        };
      }
      return byDate[date];
    };

    const parseTimeRange = (text) => {
      const range = text.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      if (range) return { startTime: range[1], endTime: range[2] };
      const single = text.match(/(\d{1,2}:\d{2})/);
      if (single) return { startTime: single[1], endTime: null };
      return { startTime: null, endTime: null };
    };

    const isSectionHeading = (line) => {
      if (/^(Vormittag|Nachmittag|Abend|Früh|Morgen|Mittag|Nacht)\b/i.test(line)) return true;
      // z.B. "Abfahrt: 07:00" oder ähnliche Zeitblöcke
      if (/\b(\d{1,2}:\d{2})\b/.test(line) && /[:\-–]/.test(line)) return true;
      return false;
    };

    (editedDocument || []).forEach((para) => {
      const line = String(para ?? '').trim();
      if (!line) return;

      const dateMatch = line.match(/^(\d{2}\.\d{2})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        ensureDate(currentDate);
        currentSection = null;
        return;
      }

      if (!currentDate) return;

      const dayObj = ensureDate(currentDate);
      if (isSectionHeading(line)) {
        const { startTime, endTime } = parseTimeRange(line);
        currentSection = {
          label: line,
          startTime,
          endTime,
          items: []
        };
        dayObj.sections.push(currentSection);
        if (startTime) {
          dayObj.byStartTime[startTime] = currentSection;
        }
        return;
      }

      if (currentSection) {
        currentSection.items.push(line);
      } else {
        dayObj.unassigned.push(line);
      }
    });

    return byDate;
  }, [editedDocument]);

  const planSubpointsByDate = useMemo(() => {
    const out = {};
    for (const [date, dayObj] of Object.entries(planByDate || {})) {
      const lines = [];
      (dayObj?.sections || []).forEach((sec) => {
        (sec?.items || []).forEach((item) => {
          const text = String(item ?? '').trim();
          if (text) lines.push(text);
        });
      });
      (dayObj?.unassigned || []).forEach((item) => {
        const text = String(item ?? '').trim();
        if (text) lines.push(text);
      });
      out[date] = lines;
    }
    return out;
  }, [planByDate]);

  const normalizeKey = (text) => {
    return String(text || '')
      .normalize('NFD')
      // Kein Unicode-Property-Regex (\p{...}) nutzen: kann in manchen Browsern crashen.
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  };

  const getImagePathsForText = (text) => {
    const raw = String(text ?? '').trim();
    if (!raw) return [];

    const stripParens = (s) => String(s)
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const candidates = [];
    candidates.push(raw);
    candidates.push(stripParens(raw));
    candidates.push(stripParens(raw.replace(/^[•\-]\s+/, '')));
    if (raw.includes(' - ')) candidates.push(stripParens(raw.split(' - ')[0]));
    if (raw.includes(':')) candidates.push(stripParens(raw.split(':')[0]));

    for (const cand of candidates) {
      const key = normalizeKey(cand);
      const hit = SUBPOINT_IMAGES?.[key];
      if (Array.isArray(hit) && hit.length > 0) return hit;
    }
    return [];
  };

  const renderImageStrip = (paths, altBase) => {
    if (!Array.isArray(paths) || paths.length === 0) return null;
    return (
      <div className="image-strip">
        {paths.map((src, idx) => (
          <a key={`${src}-${idx}`} href={src} target="_blank" rel="noreferrer">
            <img src={src} alt={`${altBase} ${idx + 1}`} loading="lazy" />
          </a>
        ))}
      </div>
    );
  };

  const extractPlaceCandidate = (line) => {
    const raw = String(line || '').trim();
    if (!raw) return null;

    // offensichtliche Nicht-Orte
    if (/^(TICKETS|Kosten:|Hinweis:|Programm:|Rückkehr:|Abfahrt:|Frühstück|Lunch|Dinner|Option)/i.test(raw)) return null;
    if (/\bStunden\b|\bUhr\b|\bStd\b|\bMin\b/i.test(raw) && !/[A-ZÄÖÜ]/.test(raw)) return null;

    // Entferne Zeit-/Kategoriezeilen
    if (/^(Vormittag|Nachmittag|Abend|Früh|Morgen|Mittag|Nacht)\b/i.test(raw)) return null;

    // Kandidat aus "X: Beschreibung" -> X
    let base = raw;
    if (base.includes(':')) {
      base = base.split(':')[0];
    }

    // Kandidat aus "X - ..." -> X
    if (base.includes(' - ')) {
      base = base.split(' - ')[0];
    }

    // Klammern entfernen
    base = base.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!base) return null;

    // sehr lange Sätze ignorieren
    if (base.length > 80) return null;

    // Heuristik: muss wie ein Ort aussehen
    const looksLikePlace = /(Mercado|Casa|Palacio|Catedral|Plaza|Torre|Parque|Alameda|Castillo|Basilica|Biblioteca|Cenote|Museo|Museum|Street|Avenue|Avenida|Centro|Jard[ií]n|Bosque|Iglesia|Church)/i.test(base);
    const hasCaps = /[A-ZÄÖÜ]/.test(base);
    if (!looksLikePlace && !hasCaps) return null;

    return {
      label: base,
      key: normalizeKey(base)
    };
  };

  // Reisedaten mit allen Orten und Fahrzeiten
  const reiseDatenRaw = [
    {
      tag: 0,
      datum: "08.04",
      title: "Ankunft Navarte",
      orte: [
        { name: "Navarte, Mexico City", lat: 19.3987, lng: -99.1547, zeit: "18:00", dauer: "Übernachtung", entfernung: "Start der Reise" }
        // HINWEIS: Genaue Adresse wird noch ergänzt
      ],
      beschreibung: "Ankunft am Flughafen, Transfer nach Navarte, Übernachtung",
      hinweis: "ANREISETAG"
    },
    {
      tag: 1,
      datum: "09.04",
      title: "Roma/Condesa",
      orte: [
        { name: "Navarte (Start)", lat: 19.3987, lng: -99.1547, zeit: "10:00", dauer: "Start", typ: "base" },
        { name: "Parque de los Venados", lat: 19.3723603, lng: -99.1558202, zeit: "10:00", dauer: "3h", entfernung: "2.9 km / 10 Min" },
        { name: "Roma Norte", lat: 19.4195256, lng: -99.162549, zeit: "14:00", dauer: "4h", entfernung: "5.3 km / 15 Min" },
        { name: "Parque México Condesa", lat: 19.4122631, lng: -99.1695776, zeit: "19:00", dauer: "3h", entfernung: "1 km / 5 Min" },
        { name: "Navarte (Rückkehr)", lat: 19.3987, lng: -99.1547, zeit: "22:00", dauer: "Ende", entfernung: "2.1 km / 8 Min", typ: "base" }
      ],
      beschreibung: "Street Art an der Álvaro Obregón Avenue, Mercado de Medellín, Art-Déco-Architektur",
      gesamtEntfernung: "11.3 km",
      gesamtFahrtzeit: "38 Min"
    },
    {
      tag: 2,
      datum: "10.04",
      title: "Centro Histórico",
      orte: [
        { name: "Navarte (Start)", lat: 19.3987, lng: -99.1547, zeit: "08:30", dauer: "Start", typ: "base" },
        { name: "Zócalo", lat: 19.4324051, lng: -99.134078, zeit: "09:00", dauer: "2h", entfernung: "5 km / 12 Min" },
        { name: "Templo Mayor Museum", lat: 19.4346038, lng: -99.131881, zeit: "11:00", dauer: "2h", entfernung: "300m / 1 Min" },
        { name: "Torre Latinoamericana", lat: 19.4338974, lng: -99.1406461, zeit: "18:00", dauer: "2h", entfernung: "1 km / 4 Min" },
        { name: "Plaza Garibaldi", lat: 19.440413, lng: -99.1392564, zeit: "20:00", dauer: "2h", entfernung: "800m / 3 Min" },
        { name: "Navarte (Rückkehr)", lat: 19.3987, lng: -99.1547, zeit: "22:00", dauer: "Ende", entfernung: "5 km / 15 Min", typ: "base" }
      ],
      beschreibung: "Fahnenzeremonie 8 Uhr, Kathedrale, Diego Rivera Murals, Mariachi-Musik",
      gesamtEntfernung: "16 km",
      gesamtFahrtzeit: "46 Min"
    },
    {
      tag: 3,
      datum: "11.04",
      title: "Bellas Artes & Alameda",
      orte: [
        { name: "Palacio de Bellas Artes", lat: 19.4352, lng: -99.1412, zeit: "09:00", dauer: "4h", entfernung: "700m / 2 Min vom Zócalo" },
        { name: "Casa de los Azulejos", lat: 19.4342214, lng: -99.1401815, zeit: "14:00", dauer: "2h", entfernung: "200m / 1 Min" },
        { name: "Alameda Central", lat: 19.4359374, lng: -99.1439285, zeit: "19:00", dauer: "3h", entfernung: "300m / 1 Min" }
      ],
      beschreibung: "Diego Rivera Murals (95 MXN), Café in Casa de los Azulejos, historischer Park"
    },
    {
      tag: 4,
      datum: "12.04",
      title: "Tagesausflug Tula",
      orte: [
        { name: "Zona Arqueológica de Tula", lat: 20.0673993, lng: -99.3330479, zeit: "09:00", dauer: "6h", entfernung: "90 km / 90-120 Min" }
      ],
      beschreibung: "4,5m hohe Atlanten-Krieger! Tolteken-Stätten. Transport 20-40€ p.P.",
      hinweis: "LANGE FAHRT - ganztägig einplanen"
    },
    {
      tag: 5,
      datum: "13.04",
      title: "Chapultepec & Coyoacán",
      orte: [
        { name: "Chapultepec Castle", lat: 19.4204397, lng: -99.181935, zeit: "10:00", dauer: "3h", entfernung: "6 km / 15 Min von Centro" },
        { name: "Bosque de Chapultepec", lat: 19.4194815, lng: -99.1894558, zeit: "13:00", dauer: "2h", entfernung: "1 km / 3 Min" },
        { name: "Jardín Hidalgo Coyoacán", lat: 19.3495086, lng: -99.1626379, zeit: "15:00", dauer: "2h", entfernung: "9 km / 20 Min" },
        { name: "Mercado Coyoacán", lat: 19.3525932, lng: -99.1615446, zeit: "17:00", dauer: "3h", entfernung: "500m / 2 Min" }
      ],
      beschreibung: "Schloss früh besuchen (9-10 Uhr)! Montags geschlossen. Botanischer Garten, Kunsthandwerk"
    },
    {
      tag: 6,
      datum: "14.04",
      title: "Frida Kahlo Tag",
      orte: [
        { name: "Casa Azul (Frida Kahlo Museum)", lat: 19.3551806, lng: -99.1624636, zeit: "09:00", dauer: "3h", entfernung: "600m / 2 Min von Jardín Hidalgo" }
      ],
      beschreibung: "TICKETS VORHER ONLINE! 2-3 Stunden einplanen. Kombi-Ticket mit Anahuacalli kaufen",
      hinweis: "Montags geschlossen"
    },
    {
      tag: 7,
      datum: "15.04",
      title: "Teotihuacán",
      orte: [
        { name: "Teotihuacán Pyramiden", lat: 19.6860799, lng: -98.8716361, zeit: "09:00", dauer: "5h", entfernung: "50 km / 50-60 Min" }
      ],
      beschreibung: "Abfahrt 6 Uhr! Sonnen- & Mondpyramide. Heißluftballonfahrt möglich",
      hinweis: "SEHR FRÜH STARTEN"
    },
    {
      tag: 8,
      datum: "16.04",
      title: "Basilica & Los Dinamos",
      orte: [
        { name: "Basilica de Guadalupe", lat: 19.4847584, lng: -99.1178893, zeit: "08:00", dauer: "3h", entfernung: "12 km / 25 Min von Centro" },
        { name: "Los Dinamos Naturpark", lat: 19.2958536, lng: -99.2555451, zeit: "13:00", dauer: "5h", entfernung: "35 km / 45-60 Min" }
      ],
      beschreibung: "Wichtigste Pilgerstätte - WOCHENTAG besuchen! Wandern, Wasserfälle"
    },
    {
      tag: 9,
      datum: "17.04",
      title: "Märkte & Street Art",
      orte: [
        { name: "Mercado de la Ciudadela", lat: 19.4308122, lng: -99.1493693, zeit: "09:00", dauer: "4h", entfernung: "3 km / 10 Min von Centro" },
        { name: "Roma Norte Street Art", lat: 19.4195256, lng: -99.162549, zeit: "14:00", dauer: "4h", entfernung: "2 km / 8 Min" }
      ],
      beschreibung: "Kunsthandwerk & Souvenirs, Street-Art-Tour mit lokalem Guide - VIELE FOTOS!"
    },
    {
      tag: 10,
      datum: "18.04",
      title: "Xochimilco",
      orte: [
        { name: "Xochimilco Trajineras", lat: 19.2572314, lng: -99.1029664, zeit: "09:00", dauer: "5h", entfernung: "28 km / 40-50 Min vom Centro" }
      ],
      beschreibung: "2-3h Bootsfahrt auf schwimmenden Gärten! Mariachi-Bands, Essen & Trinken an Bord"
    },
    {
      tag: 11,
      datum: "19.04",
      title: "Moderne Architektur",
      orte: [
        { name: "Biblioteca Vasconcelos", lat: 19.4467383, lng: -99.1528649, zeit: "10:00", dauer: "3h", entfernung: "7 km / 18 Min von Roma" }
      ],
      beschreibung: "Raumschiff-Bibliothek von Alberto Kalach - futuristische Architektur"
    },
    {
      tag: 12,
      datum: "20.04",
      title: "Taxco Silberstadt",
      orte: [
        { name: "Taxco", lat: 18.5565468, lng: -99.6051206, zeit: "10:00", dauer: "7h", entfernung: "170 km / 180-210 Min" }
      ],
      beschreibung: "Santa Prisca Kirche, Silber-Shopping, Seilbahn! Bus ~25€, Tour 60-80€ p.P.",
      hinweis: "SEHR LANGE FAHRT - ganztägig"
    },
    {
      tag: 13,
      datum: "21.04",
      title: "Weiterreise Tulum",
      orte: [
        { name: "Cancún Airport", lat: 21.0419232, lng: -86.8743844, zeit: "14:00", dauer: "2h", entfernung: "FLUG 1.300 km / 120 Min" },
        { name: "Tulum", lat: 20.2114185, lng: -87.4653502, zeit: "18:00", dauer: "3h", entfernung: "130 km / 90-120 Min Fahrt" }
      ],
      beschreibung: "Flug zur Karibikküste - Check-in & Strandspaziergang",
      hinweis: "REISEETAPPE"
    },
    {
      tag: 14,
      datum: "22.04",
      title: "Cenoten & Beach",
      orte: [
        { name: "Cenote Dos Ojos", lat: 20.3250063, lng: -87.390814, zeit: "10:00", dauer: "3h", entfernung: "20 km / 25 Min" },
        { name: "Gran Cenote", lat: 20.2465818, lng: -87.464201, zeit: "14:00", dauer: "3h", entfernung: "15 km / 15 Min" }
      ],
      beschreibung: "Schnorcheln in Unterwasserhöhlen! Dos Ojos 400 MXN, Gran Cenote 500 MXN - Schildkröten!"
    },
    {
      tag: 15,
      datum: "23.04",
      title: "Playa Paraíso",
      orte: [
        { name: "Playa Paraíso", lat: 20.2017151, lng: -87.4334647, zeit: "10:00", dauer: "8h", entfernung: "3 km / 10 Min" }
      ],
      beschreibung: "Traumstrand mit türkisem Wasser! Beach Club, Relaxen, Temazcal-Zeremonie möglich"
    },
    {
      tag: 17,
      datum: "25.04",
      title: "Sian Ka'an Biosphäre",
      orte: [
        { name: "Sian Ka'an Biosphärenreservat", lat: 19.8509509, lng: -87.6393431, zeit: "08:00", dauer: "8h", entfernung: "45 km / 60 Min" }
      ],
      beschreibung: "UNESCO Welterbe! Delfine, Schildkröten, Mangroven. Lazy River schwimmen, Bootstour",
      hinweis: "Ganztagestour"
    },
    {
      tag: 18,
      datum: "26.04",
      title: "Umzug Playa del Carmen",
      orte: [
        { name: "Playa del Carmen", lat: 20.6295586, lng: -87.0738851, zeit: "14:00", dauer: "7h", entfernung: "70 km / 60 Min" }
      ],
      beschreibung: "Beach Clubs (Lido, INTI), Quinta Avenida zum Bummeln, Basis für Cozumel"
    },
    {
      tag: 20,
      datum: "28.04",
      title: "Cozumel Tagesausflug",
      orte: [
        { name: "Cozumel - Palancar Reef", lat: 20.33671, lng: -87.026914, zeit: "09:00", dauer: "7h", entfernung: "Fähre 45 Min" }
      ],
      beschreibung: "Schnorcheln am Mesoamerikanischen Riff! El Cielo & Palancar Reef - zweitgrößtes Riff der Welt"
    },
    {
      tag: 22,
      datum: "30.04",
      title: "Rückreise MEX",
      orte: [
        { name: "Cancún Airport", lat: 21.0419232, lng: -86.8743844, zeit: "14:00", dauer: "4h", entfernung: "55 km / 60 Min" }
      ],
      beschreibung: "Flug nach Mexiko-Stadt, Hotel am Flughafen, Abflug nach Frankfurt am 01.05",
      hinweis: "ABREISE"
    },
    {
      tag: 23,
      datum: "01.05",
      title: "Rückkehr Navarte / Abflug",
      orte: [
        { name: "Navarte, Mexico City", lat: 19.3987, lng: -99.1547, zeit: "06:00", dauer: "Checkout", entfernung: "Ende der Reise" }
        // HINWEIS: Genaue Adresse wird noch ergänzt
      ],
      beschreibung: "Letzte Nacht in Navarte, früher Checkout für Rückflug nach Frankfurt",
      hinweis: "ABREISETAG"
    }
  ];

  const dateToTag = useMemo(() => {
    const m = {};
    (reiseDatenRaw || []).forEach((d) => {
      m[d.datum] = d.tag;
    });
    return m;
  }, []);

  // Fehlende Orte aus Unterpunkten automatisch per Google Places auflösen
  useEffect(() => {
    if (!mapLoaded) return;
    if (!window.google?.maps?.places) return;

    const resolvedKeys = new Set(Object.keys(placeCache || {}));
    const candidates = [];

    Object.entries(planByDate || {}).forEach(([date, dayPlan]) => {
      const tagNum = dateToTag[date];
      (dayPlan?.sections || []).forEach((section) => {
        (section.items || []).forEach((line) => {
          const cand = extractPlaceCandidate(line);
          if (!cand) return;
          if (resolvedKeys.has(cand.key)) return;
          candidates.push({ ...cand, date, tagNum });
          resolvedKeys.add(cand.key);
        });
      });
    });

    if (!candidates.length) return;

    const limit = 12; // pro Session begrenzen
    const queue = candidates.slice(0, limit);
    let cancelled = false;

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));

    const centerForTag = (tagNum) => {
      // Mexico City als Default
      if (typeof tagNum !== 'number') return { lat: 19.4326, lng: -99.1332 };
      if (tagNum >= 13) return { lat: 20.2114, lng: -87.4654 }; // Tulum Region
      return { lat: 19.4326, lng: -99.1332 };
    };

    const resolveOne = (item) => {
      return new Promise((resolve) => {
        const center = centerForTag(item.tagNum);
        const query = `${item.label}, Mexico`;

        service.textSearch(
          {
            query,
            location: new window.google.maps.LatLng(center.lat, center.lng),
            radius: 60000
          },
          (results, status) => {
            if (cancelled) return resolve(null);
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results?.length) {
              return resolve({ key: item.key, notFound: true });
            }

            const top = results[0];
            const loc = top?.geometry?.location;
            if (!loc) return resolve({ key: item.key, notFound: true });

            resolve({
              key: item.key,
              place: {
                name: top.name || item.label,
                lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
                lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng
              }
            });
          }
        );
      });
    };

    (async () => {
      for (const item of queue) {
        if (cancelled) break;
        const res = await resolveOne(item);
        if (!res) continue;

        if (res.notFound) {
          console.warn('[Places] not found:', item.label);
        } else {
          console.log('[Places] resolved:', item.label, res.place);
        }

        setPlaceCache((prev) => {
          if (prev?.[res.key]) return prev;
          if (res.notFound) return { ...prev, [res.key]: { notFound: true } };
          return { ...prev, [res.key]: res.place };
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapLoaded, planByDate, dateToTag, placeCache]);

  const reiseDaten = useMemo(() => {
    const NAVARTE = {
      name: 'Navarte, Mexico City',
      lat: 19.3987,
      lng: -99.1547
    };

    const findFirstTime = (list) => {
      const timeRegex = /^(\d{1,2}:\d{2})$/;
      for (const entry of list) {
        const t = String(entry?.zeit || '').trim();
        if (timeRegex.test(t)) return t;
      }
      return null;
    };

    const findLastTime = (list) => {
      const timeRegex = /^(\d{1,2}:\d{2})$/;
      for (let i = list.length - 1; i >= 0; i--) {
        const t = String(list[i]?.zeit || '').trim();
        if (timeRegex.test(t)) return t;
      }
      return null;
    };

    const ensureNavarte = (orte) => {
      const list = Array.isArray(orte) ? [...orte] : [];

      const startTime = findFirstTime(list) || '08:00';
      const returnTime = findLastTime(list) || '22:00';

      const hasStart = list.some((o) => String(o?.name || '').toLowerCase().includes('navarte') && String(o?.name || '').toLowerCase().includes('start'));
      const hasReturn = list.some((o) => String(o?.name || '').toLowerCase().includes('navarte') && (String(o?.name || '').toLowerCase().includes('rückkehr') || String(o?.name || '').toLowerCase().includes('rueckkehr')));

      if (!hasStart) {
        list.unshift({
          name: 'Navarte (Start)',
          lat: NAVARTE.lat,
          lng: NAVARTE.lng,
          zeit: startTime,
          dauer: 'Start',
          typ: 'base'
        });
      }

      if (!hasReturn) {
        list.push({
          name: 'Navarte (Rückkehr)',
          lat: NAVARTE.lat,
          lng: NAVARTE.lng,
          zeit: returnTime,
          dauer: 'Ende',
          typ: 'base'
        });
      }

      return list;
    };

    // Index bekannter Orte (Name -> Koordinaten) aus allen reiseDatenRaw
    const knownPlaces = new Map();
    (reiseDatenRaw || []).forEach((d) => {
      (d?.orte || []).forEach((o) => {
        const name = String(o?.name || '').trim();
        if (!name) return;
        if (typeof o?.lat !== 'number' || typeof o?.lng !== 'number') return;
        knownPlaces.set(name.toLowerCase(), { name, lat: o.lat, lng: o.lng });
      });
    });

    const findKnownPlaceInLine = (line) => {
      const text = String(line || '').toLowerCase();
      for (const [nameLower, place] of knownPlaces.entries()) {
        if (text.includes(nameLower)) return place;
      }
      return null;
    };

    const injectSubpointPlaces = (day) => {
      const dayPlan = planByDate?.[day?.datum];
      if (!dayPlan?.sections?.length) return day;

      const alreadyHas = new Set((day.orte || []).map((o) => String(o?.name || '').toLowerCase()));
      const byTimeToInsert = {};

      dayPlan.sections.forEach((section) => {
        if (!section?.startTime) return;
        (section.items || []).forEach((line) => {
          const known = findKnownPlaceInLine(line);
          const cand = extractPlaceCandidate(line);

          let place = known;
          if (!place && cand && placeCache?.[cand.key] && !placeCache[cand.key].notFound) {
            place = {
              name: placeCache[cand.key].name || cand.label,
              lat: placeCache[cand.key].lat,
              lng: placeCache[cand.key].lng
            };
          }

          if (!place) return;
          const key = String(place.name || '').toLowerCase();
          if (!key) return;
          if (alreadyHas.has(key)) return;

          alreadyHas.add(key);
          if (!byTimeToInsert[section.startTime]) byTimeToInsert[section.startTime] = [];
          byTimeToInsert[section.startTime].push({
            name: place.name,
            lat: place.lat,
            lng: place.lng,
            zeit: section.startTime,
            dauer: 'Optional'
          });
        });
      });

      const newOrte = [];
      const inserted = new Set();

      (day.orte || []).forEach((o) => {
        newOrte.push(o);
        const t = String(o?.zeit || '').trim();
        if (byTimeToInsert[t] && !inserted.has(t)) {
          newOrte.push(...byTimeToInsert[t]);
          inserted.add(t);
        }
      });

      // Falls ein Zeitblock keinen passenden Ort hat, ans Ende hängen
      Object.entries(byTimeToInsert).forEach(([time, items]) => {
        if (!inserted.has(time)) newOrte.push(...items);
      });

      return { ...day, orte: newOrte };
    };

    return (reiseDatenRaw || []).map((day) => {
      // "Jeden Tag in Mexico" -> die Mexico City Phase (Tag 0-12)
      if (typeof day?.tag === 'number' && day.tag >= 0 && day.tag <= 12) {
        const withNavarte = {
          ...day,
          orte: ensureNavarte(day.orte)
        };
        return injectSubpointPlaces(withNavarte);
      }
      return injectSubpointPlaces(day);
    });
  }, [planByDate, placeCache]);

  // Google Maps laden
  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const existing = document.getElementById('google-maps-js');
    if (existing) {
      existing.addEventListener('load', () => setMapLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js';
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API Key fehlt: VITE_GOOGLE_MAPS_API_KEY ist nicht gesetzt');
      return;
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Karte initialisieren
  useEffect(() => {
    if (!mapLoaded || activeTab !== 'karte') return;

    // Kleines Timeout damit das DOM vollständig gerendert ist
    const timeout = setTimeout(() => {
      const mapDiv = document.getElementById('map');
      if (!mapDiv) return;

      const map = new window.google.maps.Map(mapDiv, {
      center: { lat: 19.4326, lng: -99.1332 }, // Mexiko-Stadt
      zoom: filteredDay ? 12 : 6, // Näher zoomen wenn Tag gefiltert
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_RIGHT,
      },
      streetViewControl: false,
      fullscreenControl: true,
    });

    const bounds = new window.google.maps.LatLngBounds();
    const markers = [];
    const infoWindows = [];

    const placesService = new window.google.maps.places.PlacesService(map);
    // v2: Cache-Version bump, damit alte "notFound"-Einträge nicht alles blockieren
    const PHOTO_CACHE_KEY = 'mexiko-place-photo-cache-v2';

    const readPhotoCache = () => {
      try {
        const raw = localStorage.getItem(PHOTO_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };

    const writePhotoCache = (cacheObj) => {
      try {
        localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cacheObj || {}));
      } catch {
        // ignore
      }
    };

    const PLACEHOLDER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="440" viewBox="0 0 700 440">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#667eea"/>
            <stop offset="1" stop-color="#06D6A0"/>
          </linearGradient>
        </defs>
        <rect width="700" height="440" fill="url(#g)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="28" fill="rgba(255,255,255,0.95)">
          Foto wird geladen…
        </text>
      </svg>`
    )}`;

    const NOT_FOUND_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="440" viewBox="0 0 700 440">
        <rect width="700" height="440" fill="#f3f4f6"/>
        <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="26" fill="#6b7280">
          Kein Foto gefunden
        </text>
        <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#9ca3af">
          (Google Places Photos)
        </text>
      </svg>`
    )}`;

    const getPlacesPhoto = (queryText, biasLocation) => {
      const q = String(queryText ?? '').trim();
      if (!q) {
        return Promise.resolve({ ok: false, status: 'NO_QUERY', urls: [], attributionHtml: '', fromCache: false });
      }

      const MAX_PHOTOS = 5;

      const extractFromPhotos = (photos) => {
        const list = Array.isArray(photos) ? photos.slice(0, MAX_PHOTOS) : [];
        const urls = list
          .map((p) => p?.getUrl?.({ maxWidth: 700, maxHeight: 440 }))
          .filter(Boolean);

        const attributionParts = list
          .flatMap((p) => Array.isArray(p?.html_attributions) ? p.html_attributions : [])
          .filter(Boolean);

        const attributionHtml = attributionParts.length > 0
          ? Array.from(new Set(attributionParts)).join(' ')
          : '';

        return { urls, attributionHtml };
      };

      const locKey = (biasLocation?.lat != null && biasLocation?.lng != null)
        ? `@${Number(biasLocation.lat).toFixed(3)},${Number(biasLocation.lng).toFixed(3)}`
        : '';
      const cacheKey = normalizeKey(`${q}${locKey}`);
      const cache = readPhotoCache();
      const cached = cache?.[cacheKey];
      if (cached) {
        // Wichtig: Permission-/Netzwerkfehler NICHT aus Cache zurückgeben,
        // sonst bleibt es auch nach Fix (API-Key/Billing/Referrer) "kaputt".
        const cachedStatus = String(cached.status || '').toUpperCase();
        const transientOrDenied = cachedStatus === 'REQUEST_DENIED' || cachedStatus === 'TIMEOUT' || cachedStatus === 'EXCEPTION';
        if (!transientOrDenied) {
          if (cached.notFound) {
            return Promise.resolve({ ok: false, status: cached.status || 'CACHED_NOT_FOUND', urls: [], attributionHtml: '', fromCache: true });
          }
          // Backward compatible: früher gab es nur "url" statt "urls"
          const cachedUrls = Array.isArray(cached.urls)
            ? cached.urls
            : (cached.url ? [cached.url] : []);
          if (cachedUrls.length > 0) {
            return Promise.resolve({ ok: true, status: cached.status || 'OK', urls: cachedUrls, attributionHtml: cached.attributionHtml || '', fromCache: true });
          }
        }
      }

      return new Promise((resolve) => {
        let didFinish = false;
        const timeoutId = setTimeout(() => {
          if (didFinish) return;
          didFinish = true;
          resolve({ ok: false, status: 'TIMEOUT', urls: [], attributionHtml: '', fromCache: false });
        }, 9000);

        try {
          const request = {
            query: q,
          };

          // Bias: wenn wir Koordinaten haben, erhöht das die Trefferqualität.
          if (biasLocation?.lat != null && biasLocation?.lng != null) {
            request.location = new window.google.maps.LatLng(biasLocation.lat, biasLocation.lng);
            request.radius = 5000;
          }

          placesService.textSearch(request, (results, status) => {
            if (didFinish) return;
            didFinish = true;
            clearTimeout(timeoutId);

            const statusText = String(status || 'UNKNOWN');
            const ok = status === window.google.maps.places.PlacesServiceStatus.OK;

            if (!ok || !results?.length) {
              // Nur "echte" Nicht-Treffer cachen, nicht Permission/Netzwerk.
              const upper = statusText.toUpperCase();
              if (upper !== 'REQUEST_DENIED') {
                const next = { ...cache, [cacheKey]: { notFound: true, status: statusText } };
                writePhotoCache(next);
              }
              resolve({ ok: false, status: statusText, urls: [], attributionHtml: '', fromCache: false });
              return;
            }

            const place = results[0];

            const finishWithPhotos = (photos, statusOverride) => {
              const { urls, attributionHtml } = extractFromPhotos(photos);
              if (!urls.length) {
                const next = { ...cache, [cacheKey]: { notFound: true, status: statusOverride || 'NO_PHOTO' } };
                writePhotoCache(next);
                resolve({ ok: false, status: statusOverride || 'NO_PHOTO', urls: [], attributionHtml: '', fromCache: false });
                return;
              }

              const payload = { urls, attributionHtml };
              const next = { ...cache, [cacheKey]: { ...payload, status: 'OK' } };
              writePhotoCache(next);
              resolve({ ok: true, status: 'OK', urls, attributionHtml, fromCache: false });
            };

            // TextSearch liefert oft nur ein Foto. Mit getDetails bekommen wir i.d.R. mehr.
            const placeId = place?.place_id;
            if (placeId) {
              try {
                placesService.getDetails(
                  { placeId, fields: ['photos'] },
                  (details, detailsStatus) => {
                    const ds = String(detailsStatus || 'UNKNOWN');
                    const okDetails = detailsStatus === window.google.maps.places.PlacesServiceStatus.OK;
                    if (okDetails && details?.photos?.length) {
                      finishWithPhotos(details.photos, null);
                      return;
                    }

                    // Fallback: nutze Photos aus dem TextSearch-Ergebnis
                    finishWithPhotos(place?.photos, `DETAILS_${ds}`);
                  }
                );
                return;
              } catch (e) {
                console.warn('Places getDetails failed:', e);
                finishWithPhotos(place?.photos, 'DETAILS_EXCEPTION');
                return;
              }
            }

            // Kein placeId: direkt aus TextSearch nutzen
            finishWithPhotos(place?.photos, null);
          });
        } catch (err) {
          console.warn('Places photo lookup failed:', err);
          if (didFinish) return;
          didFinish = true;
          clearTimeout(timeoutId);
          resolve({ ok: false, status: 'EXCEPTION', urls: [], attributionHtml: '', fromCache: false });
        }
      });
    };

    const buildInfoContent = ({ ort, tag, markerColor, photoUrls, photoAttributionHtml, placesStatusText }) => {
      const urls = Array.isArray(photoUrls) && photoUrls.length > 0 ? photoUrls : [NOT_FOUND_SVG];
      const attributionBlock = photoAttributionHtml
        ? `<div style="margin-top: 6px; font-size: 11px; color: #666;">${photoAttributionHtml}</div>`
        : '';

      const placesBlock = placesStatusText
        ? `<div style="margin-top: 6px; font-size: 11px; color: #6b7280;">Places: ${placesStatusText}</div>`
        : '';

      const photosBlock = urls.length <= 1
        ? `
            <img src="${urls[0]}" 
                 style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"
                 alt="${ort.name}"
                 loading="lazy">
          `
        : `
            <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
              ${urls.map((u, i) => `
                <img src="${u}" 
                     style="height: 150px; width: 240px; object-fit: cover; border-radius: 8px; flex: 0 0 auto;"
                     alt="${ort.name} ${i + 1}"
                     loading="lazy">
              `).join('')}
            </div>
          `;

      return `
        <div style="padding: 10px; min-width: 250px; max-width: 350px;">
          <div style="margin-bottom: 10px;">
            ${photosBlock}
            ${attributionBlock}
              ${placesBlock}
          </div>
          <h3 style="margin: 0 0 8px 0; color: ${markerColor}; font-size: 16px;">
            ${ort.typ === 'base' ? '🏠' : '🕐'} ${ort.zeit} - ${ort.name}
          </h3>
          <p style="margin: 4px 0; font-size: 13px;"><strong>📅 Tag ${tag.tag} - ${tag.datum}</strong> - ${tag.title}</p>
          <p style="margin: 4px 0; font-size: 13px;">⏱️ Aufenthalt: ${ort.dauer}</p>
          ${ort.entfernung ? `<p style="margin: 4px 0; font-size: 14px; color: #E63946; font-weight: bold;">🚗 ${ort.entfernung} vom vorherigen Ort</p>` : ''}
          ${tag.gesamtEntfernung ? `<p style="margin: 8px 0 4px 0; font-size: 12px; background: #f0f0f0; padding: 6px; border-radius: 4px;"><strong>📊 Gesamt heute:</strong> ${tag.gesamtEntfernung} • ${tag.gesamtFahrtzeit} Fahrtzeit</p>` : ''}
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">${tag.beschreibung}</p>
          ${tag.hinweis ? `<p style="margin: 4px 0; font-size: 12px; color: #E63946; font-weight: bold;">⚠️ ${tag.hinweis}</p>` : ''}
          <button onclick="window.goToNotes(${tag.tag})" 
                  style="margin-top: 10px; background: #667eea; color: white; border: none; 
                         padding: 8px 16px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 13px;">
            📝 Zu den Notizen von Tag ${tag.tag}
          </button>
        </div>
      `;
    };

    // Nur ausgewählten Tag zeigen wenn filteredDay gesetzt ist
    const tagsToShow = filteredDay 
      ? reiseDaten.filter(tag => tag.tag === filteredDay)
      : reiseDaten;

    // Marker für alle Tage erstellen
    tagsToShow.forEach((tag, tagIndex) => {
      tag.orte.forEach((ort, ortIndex) => {
        const position = { lat: ort.lat, lng: ort.lng };
        
        // Farbe basierend auf Region
        let markerColor = '#E63946'; // Rot für Mexiko-Stadt
        if (tag.tag >= 13) markerColor = '#06D6A0'; // Grün für Karibik
        if (tag.tag === 4 || tag.tag === 7 || tag.tag === 12) markerColor = '#F77F00'; // Orange für Ausflüge

        const marker = new window.google.maps.Marker({
          position: position,
          map: map,
          title: `${ort.zeit} - ${ort.name}`,
          label: {
            text: filteredDay ? ort.zeit : `${tag.tag}`, // Uhrzeit bei Filter, sonst Tag-Nummer
            color: 'white',
            fontWeight: 'bold',
            fontSize: filteredDay ? '10px' : '12px'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeColor: 'white',
            strokeWeight: 2,
            scale: filteredDay ? 18 : 15, // Größer bei Filter
          }
        });

        // Sofort ein Placeholder-Bild anzeigen; echtes Foto wird lazy nachgeladen.
        const initialImageUrls = [PLACEHOLDER_SVG];

        // Entfernungslinie zum vorherigen Ort zeichnen
        if (ortIndex > 0) {
          const prevOrt = tag.orte[ortIndex - 1];
          const line = new window.google.maps.Polyline({
            path: [
              { lat: prevOrt.lat, lng: prevOrt.lng },
              { lat: ort.lat, lng: ort.lng }
            ],
            geodesic: true,
            strokeColor: markerColor,
            strokeOpacity: 0.8,
            strokeWeight: 3,
            map: map,
            icons: [{
              icon: {
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                fillColor: markerColor,
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 1
              },
              offset: '50%'
            }]
          });
        }

        const infoWindow = new window.google.maps.InfoWindow({
          content: buildInfoContent({
            ort,
            tag,
            markerColor,
            photoUrls: initialImageUrls,
            photoAttributionHtml: ''
          })
        });

        marker.addListener('click', () => {
          infoWindows.forEach(iw => iw.close());
          infoWindow.open(map, marker);

          // Sofort Status anzeigen, damit klar ist, dass Places wirklich läuft
          infoWindow.setContent(buildInfoContent({
            ort,
            tag,
            markerColor,
            photoUrls: initialImageUrls,
            photoAttributionHtml: '',
            placesStatusText: 'LOADING'
          }));

          // Lazy: Foto erst beim Klick suchen (Quota/Performance)
          getPlacesPhoto(ort.name, { lat: ort.lat, lng: ort.lng }).then((photo) => {
            const count = Array.isArray(photo?.urls) ? photo.urls.length : 0;
            const statusText = `${photo?.status || 'UNKNOWN'}${photo?.fromCache ? ' (cache)' : ''}${count ? ` • ${count} Fotos` : ''}`;

            if (!photo?.ok || !Array.isArray(photo?.urls) || photo.urls.length === 0) {
              infoWindow.setContent(buildInfoContent({
                ort,
                tag,
                markerColor,
                photoUrls: [NOT_FOUND_SVG],
                photoAttributionHtml: '',
                placesStatusText: statusText
              }));
              return;
            }

            infoWindow.setContent(buildInfoContent({
              ort,
              tag,
              markerColor,
              photoUrls: photo.urls,
              photoAttributionHtml: photo.attributionHtml,
              placesStatusText: statusText
            }));
          });
        });

        markers.push(marker);
        infoWindows.push(infoWindow);
        bounds.extend(position);

        // Linien zwischen Orten des gleichen Tages zeichnen
        if (ortIndex > 0) {
          const prevOrt = tag.orte[ortIndex - 1];
          new window.google.maps.Polyline({
            path: [
              { lat: prevOrt.lat, lng: prevOrt.lng },
              { lat: ort.lat, lng: ort.lng }
            ],
            geodesic: true,
            strokeColor: markerColor,
            strokeOpacity: 0.6,
            strokeWeight: 2,
            map: map
          });
        }
      });

      // Verbindung zwischen aufeinanderfolgenden Tagen (letzter Ort -> erster Ort nächster Tag)
      if (tagIndex < reiseDaten.length - 1) {
        const currentLastOrt = tag.orte[tag.orte.length - 1];
        const nextFirstOrt = reiseDaten[tagIndex + 1].orte[0];
        
        new window.google.maps.Polyline({
          path: [
            { lat: currentLastOrt.lat, lng: currentLastOrt.lng },
            { lat: nextFirstOrt.lat, lng: nextFirstOrt.lng }
          ],
          geodesic: true,
          strokeColor: '#999',
          strokeOpacity: 0.3,
          strokeWeight: 1,
          strokeStyle: 'dashed',
          map: map
        });
      }
    });

    map.fitBounds(bounds);
    }, 100); // 100ms Verzögerung

    return () => clearTimeout(timeout);
  }, [mapLoaded, activeTab, filteredDay]); // filteredDay hinzugefügt

  // Globale Funktion für "Zu den Notizen" Button
  useEffect(() => {
    window.goToNotes = (day) => {
      setActiveTab('notizen');
      setTimeout(() => {
        const element = document.getElementById(`notiz-tag-${day}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('highlight');
          setTimeout(() => element.classList.remove('highlight'), 2000);
        }
      }, 100);
    };
  }, []);

  // Wetter laden beim Start
  useEffect(() => {
    const loadWeather = async () => {
      setWeatherLoading(true);
      const [mexicoCurrent, tulumCurrent, playaCurrent, forecast] = await Promise.all([
        weatherAPI.getCurrentWeather('Mexico City'),
        weatherAPI.getCurrentWeather('Tulum'),
        weatherAPI.getCurrentWeather('Playa del Carmen'),
        weatherAPI.getForecast('Mexico City')
      ]);

      setCurrentWeather(mexicoCurrent);
      setTulumWeather(tulumCurrent);
      setPlayaWeather(playaCurrent);
      setWeatherForecast(forecast);
      setWeatherLoading(false);
    };
    
    loadWeather();
  }, []);

  const getOrtStyleClass = (ort) => {
    const name = String(ort?.name || '').toLowerCase();
    if (!name.includes('navarte')) return '';
    if (name.includes('start')) return 'navarte-start';
    if (name.includes('rückkehr') || name.includes('rueckkehr')) return 'navarte-return';
    return 'navarte';
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>🇲🇽 Mexiko-Reise 2025</h1>
            <p>3 Wochen von Mexiko-Stadt bis zur Karibikküste</p>
          </div>
          
          <div className="header-widgets">
            {/* Wetter Widget */}
            {!weatherLoading && (
              <>
                {currentWeather && (
                  <div className="weather-widget" title="Aktuelles Wetter in Mexico City">
                    <img 
                      src={weatherAPI.getIconUrl(currentWeather.icon)} 
                      alt="Wetter"
                      style={{width: '50px', height: '50px'}}
                    />
                    <div className="weather-info">
                      <div className="weather-city">Mexico City</div>
                      <div className="weather-temp">{currentWeather.temp}°C</div>
                      <div className="weather-desc">{currentWeather.description}</div>
                    </div>
                  </div>
                )}

                {tulumWeather && (
                  <div className="weather-widget" title="Aktuelles Wetter in Tulum">
                    <img 
                      src={weatherAPI.getIconUrl(tulumWeather.icon)} 
                      alt="Wetter"
                      style={{width: '50px', height: '50px'}}
                    />
                    <div className="weather-info">
                      <div className="weather-city">Tulum</div>
                      <div className="weather-temp">{tulumWeather.temp}°C</div>
                      <div className="weather-desc">{tulumWeather.description}</div>
                    </div>
                  </div>
                )}

                {playaWeather && (
                  <div className="weather-widget" title="Aktuelles Wetter in Playa del Carmen">
                    <img 
                      src={weatherAPI.getIconUrl(playaWeather.icon)} 
                      alt="Wetter"
                      style={{width: '50px', height: '50px'}}
                    />
                    <div className="weather-info">
                      <div className="weather-city">Playa del Carmen</div>
                      <div className="weather-temp">{playaWeather.temp}°C</div>
                      <div className="weather-desc">{playaWeather.description}</div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Sync Status */}
            <div className="sync-status">
              <button 
                className={`sync-toggle ${syncMode === 'cloud' ? 'cloud-mode' : 'local-mode'}`}
                onClick={toggleSyncMode}
                title={syncMode === 'cloud' ? 'Cloud-Sync aktiv' : 'Nur lokal'}
              >
                {syncMode === 'cloud' ? '☁️' : '💻'} {syncMode === 'cloud' ? 'Cloud' : 'Lokal'}
              </button>
              
              {syncMode === 'cloud' && (
                <>
                  <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
                    {isOnline ? '🟢' : '🔴'} {isOnline ? 'Online' : 'Offline'}
                  </div>
                  
                  {isSyncing && <div className="syncing">🔄 Sync...</div>}
                  
                  {lastSync && !isSyncing && (
                    <div className="last-sync" title={lastSync.toLocaleString()}>
                      🕐 {new Date(lastSync).toLocaleTimeString()}
                    </div>
                  )}
                  
                  <button className="sync-btn" onClick={syncFromCloud} disabled={isSyncing}>
                    🔄 Jetzt sync
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {todayInfo?.tag && (
          <div className="today-block">
            <div className="today-main">
              <div className="today-title">📍 Heute</div>
              <div className="today-subtitle">
                Tag {todayInfo.tag.tag} • {todayInfo.tag.datum} • {todayInfo.tag.title}
              </div>
              {todayInfo.nextOrt && (
                <div className="today-row">
                  <strong>Nächster Programmpunkt:</strong> 🕐 {todayInfo.nextOrt.zeit} – {todayInfo.nextOrt.name}
                </div>
              )}
              {todayInfo.meeting && (
                <div className="today-row">
                  <strong>Treffpunkt:</strong> {todayInfo.meeting}
                </div>
              )}
              {(todayInfo.noteObj?.tickets || '').trim() && (
                <div className="today-row">
                  <strong>Tickets/Reservierung:</strong> {todayInfo.noteObj.tickets}
                </div>
              )}
              {todayInfo.nextOrt?.entfernung && (
                <div className="today-row">
                  <strong>Fahrt:</strong> 🚗 {todayInfo.nextOrt.entfernung}
                </div>
              )}
            </div>
            <div className="today-actions">
              <button
                className="today-btn"
                onClick={() => {
                  setActiveTab('karte');
                  setFilteredDay(todayInfo.tag.tag);
                  setSelectedDay(todayInfo.tag.tag);
                }}
                title="Diesen Tag auf der Karte & im Plan zeigen"
              >
                🗺️ Zu Tag
              </button>
              <button
                className="today-btn"
                onClick={() => window.goToNotes(todayInfo.tag.tag)}
                title="Notizen zu diesem Tag öffnen"
              >
                📝 Notizen
              </button>
            </div>
          </div>
        )}
        
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'karte' ? 'active' : ''}`}
            onClick={() => setActiveTab('karte')}
          >
            🗺️ Karte
          </button>
          <button 
            className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            📅 Timeline
          </button>
          <button 
            className={`tab ${activeTab === 'notizen' ? 'active' : ''}`}
            onClick={() => setActiveTab('notizen')}
          >
            📝 Notizen {notesCount > 0 && `(${notesCount})`}
          </button>
          <button 
            className={`tab ${activeTab === 'dokument' ? 'active' : ''}`}
            onClick={() => setActiveTab('dokument')}
          >
            📄 Original-Plan
          </button>
        </div>
      </header>

      {activeTab === 'karte' && (
        <div className="container">
          <div className="map-container">
            <div id="map" className="map"></div>
            {filteredDay && (
              <div className="filter-indicator">
                🔍 Zeige nur Tag {filteredDay}
                <button onClick={() => setFilteredDay(null)} className="clear-filter">
                  ✕ Alle zeigen
                </button>
              </div>
            )}
            <div className="legend">
              <h4>Legende:</h4>
              <div className="legend-item">
                <span className="legend-dot" style={{backgroundColor: '#E63946'}}></span>
                <span>Mexiko-Stadt</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{backgroundColor: '#F77F00'}}></span>
                <span>Tagesausflüge</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{backgroundColor: '#06D6A0'}}></span>
                <span>Karibikküste</span>
              </div>
            </div>
          </div>

          <div className="timeline">
            <h2>📍 Detaillierter Reiseplan</h2>
            {reiseDaten.map((tag) => (
              <div 
                key={tag.tag} 
                className={`day-card ${selectedDay === tag.tag ? 'selected' : ''}`}
              >
                <div className="day-header">
                  <h3>Tag {tag.tag} - {tag.datum}</h3>
                  <h4>{tag.title}</h4>
                  {tag.gesamtEntfernung && (
                    <div className="day-summary">
                      📊 Gesamt: {tag.gesamtEntfernung} • ⏱️ {tag.gesamtFahrtzeit}
                    </div>
                  )}
                  <div className="day-actions">
                    <button 
                      className="filter-btn"
                      onClick={() => {
                        setFilteredDay(filteredDay === tag.tag ? null : tag.tag);
                        setActiveTab('karte');
                      }}
                      title="Nur diesen Tag auf der Karte zeigen"
                    >
                      {filteredDay === tag.tag ? '🗺️ Alle zeigen' : '🔍 Nur dieser Tag'}
                    </button>
                    <button 
                      className="notes-btn"
                      onClick={() => window.goToNotes(tag.tag)}
                      title="Zu den Notizen springen"
                    >
                      📝 Notizen
                    </button>
                  </div>
                </div>
                
                {tag.hinweis && (
                  <div className="alert">⚠️ {tag.hinweis}</div>
                )}

                <div className="beschreibung">{tag.beschreibung}</div>

                {planSubpointsByDate[tag.datum]?.length > 0 && (
                  <div className="plan-subpoints">
                    <div className="plan-subpoints-title">📌 Unterpunkte</div>
                    <div className="plan-subpoints-list">
                      {planSubpointsByDate[tag.datum].map((line, idx) => (
                        <div key={idx} className="plan-subpoint">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasNoteContent(notes?.[String(tag.tag)]) && (
                  <div className="note-preview">
                    {(() => {
                      const preview = getNotePreviewText(notes?.[String(tag.tag)]);
                      return preview
                        ? <span>📝 <em>{preview.substring(0, 160)}{preview.length > 160 ? '...' : ''}</em></span>
                        : null;
                    })()}
                  </div>
                )}

                <div className="orte-liste">
                  {tag.orte.map((ort, idx) => (
                    <React.Fragment key={idx}>
                      <div className={`ort-item ${getOrtStyleClass(ort)}`}>
                        <div className="ort-header">
                          <span className="ort-zeit">🕐 {ort.zeit}</span>
                          <strong>{ort.name}</strong>
                        </div>
                        <div className="ort-details">
                          <span>⏱️ {ort.dauer}</span>
                          {ort.entfernung && <span className="entfernung">🚗 {ort.entfernung}</span>}
                        </div>
                        {renderImageStrip(getImagePathsForText(ort.name), ort.name)}
                      </div>

                      {(() => {
                        const timeKey = String(ort.zeit).trim();
                        const section = planByDate[tag.datum]?.byStartTime?.[timeKey];
                        const isFirstForTime = idx === tag.orte.findIndex((o) => String(o?.zeit).trim() === timeKey);
                        if (!isFirstForTime || !section?.items?.length) return null;
                        return (
                        <div className="ort-subpoints">
                          <div className="ort-subpoints-title">
                            {section.label}
                          </div>
                          <div className="ort-subpoints-list">
                            {section.items.map((line, spIdx) => (
                              <div key={spIdx} className="ort-subpoint">
                                <div className="ort-subpoint-text">{line}</div>
                                {renderImageStrip(getImagePathsForText(line), line)}
                              </div>
                            ))}
                          </div>
                        </div>
                        );
                      })()}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="full-timeline">
          <h2>📅 Kompletter Zeitplan</h2>
          {reiseDaten.map((tag) => (
            <div key={tag.tag} className="timeline-day">
              <div className="timeline-day-header">
                <div className="day-badge">Tag {tag.tag}</div>
                <div>
                  <h3>{tag.datum} - {tag.title}</h3>
                  <p className="beschreibung">{tag.beschreibung}</p>
                </div>
              </div>
              
              {tag.hinweis && (
                <div className="alert">⚠️ {tag.hinweis}</div>
              )}

              <div className="timeline-orte">
                {tag.orte.map((ort, idx) => (
                  <div key={idx} className={`timeline-ort ${getOrtStyleClass(ort)}`}>
                    <div className="ort-time">{ort.zeit}</div>
                    <div className="ort-connector"></div>
                    <div className="ort-content">
                      <strong>{ort.name}</strong>
                      <div className="ort-meta">
                        <span>⏱️ {ort.dauer}</span>
                        {ort.entfernung && <span>🚗 {ort.entfernung}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasNoteContent(notes?.[String(tag.tag)]) && (
                <div className="note-preview">
                  {(() => {
                    const preview = getNotePreviewText(notes?.[String(tag.tag)]);
                    return preview
                      ? <span>📝 <em>{preview.substring(0, 100)}{preview.length > 100 ? '...' : ''}</em></span>
                      : null;
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'notizen' && (
        <div className="notizen-container">
          <div className="notizen-header">
            <h2>📝 Meine Reise-Notizen</h2>
            <button className="export-btn" onClick={exportNotes}>
              💾 Notizen exportieren
            </button>
          </div>
          
          <div className="notizen-liste">
            {reiseDaten.map((tag) => (
              <div key={tag.tag} className="notiz-card" id={`notiz-tag-${tag.tag}`}>
                <div className="notiz-header">
                  <h3>Tag {tag.tag} - {tag.datum}</h3>
                  <h4>{tag.title}</h4>
                </div>
                
                {(() => {
                  const dayKey = String(tag.tag);
                  const noteObj = coerceNoteObject(notes?.[dayKey]);
                  return (
                    <>
                      <div className="note-fields">
                        <label className="note-field">
                          <span>Tickets/Reservierung</span>
                          <input
                            type="text"
                            value={noteObj.tickets}
                            onChange={(e) => updateNoteField(dayKey, 'tickets', e.target.value)}
                            placeholder="z.B. Bestätigungscode, Uhrzeit, Name"
                          />
                        </label>
                        <label className="note-field">
                          <span>Treffpunkt</span>
                          <input
                            type="text"
                            value={noteObj.treffpunkt}
                            onChange={(e) => updateNoteField(dayKey, 'treffpunkt', e.target.value)}
                            placeholder="z.B. Lobby / Eingang / Adresse"
                          />
                        </label>
                        <label className="note-field">
                          <span>Mitbringen</span>
                          <input
                            type="text"
                            value={noteObj.mitbringen}
                            onChange={(e) => updateNoteField(dayKey, 'mitbringen', e.target.value)}
                            placeholder="z.B. Sonnencreme, Wasser, Pass"
                          />
                        </label>
                        <label className="note-field">
                          <span>Kosten</span>
                          <input
                            type="text"
                            value={noteObj.kosten}
                            onChange={(e) => updateNoteField(dayKey, 'kosten', e.target.value)}
                            placeholder="z.B. Eintritt, Budget, Split"
                          />
                        </label>
                        <label className="note-field note-field-wide">
                          <span>Links</span>
                          <input
                            type="text"
                            value={noteObj.links}
                            onChange={(e) => updateNoteField(dayKey, 'links', e.target.value)}
                            placeholder="z.B. Google Maps / Tickets / Website"
                          />
                        </label>
                      </div>

                      <textarea
                        className="notiz-textarea"
                        placeholder="Freie Notizen für den Tag…"
                        value={noteObj.freeText || ''}
                        onChange={(e) => updateNote(dayKey, e.target.value)}
                        rows={4}
                      />
                    </>
                  );
                })()}
                
                <div className="notiz-orte">
                  {tag.orte.map((ort, idx) => (
                    <span key={idx} className="ort-tag">📍 {ort.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'dokument' && (
        <div className="dokument-container">
          <div className="dokument-header">
            <h2>📄 Kompletter Reiseplan</h2>
            <div className="dokument-controls">
              <button 
                className={`edit-toggle-btn ${isEditingDoc ? 'active' : ''}`}
                onClick={() => setIsEditingDoc(!isEditingDoc)}
              >
                {isEditingDoc ? '👁️ Ansicht' : '✏️ Bearbeiten'}
              </button>
              {isEditingDoc && (
                <>
                  <button className="reset-btn" onClick={resetDocument}>
                    🔄 Zurücksetzen
                  </button>
                  {syncMode === 'cloud' && isOnline && (
                    <button className="cloud-save-btn" onClick={saveDocumentToCloud} disabled={isSyncing}>
                      {isSyncing ? '⏳ Speichere...' : '☁️ In Cloud speichern'}
                    </button>
                  )}
                  <button className="export-btn" onClick={exportDocument}>
                    💾 Exportieren
                  </button>
                </>
              )}
              <a 
                href="/Reiseplan_Mexiko__1_.docx" 
                download 
                className="download-btn"
              >
                ⬇️ Original (.docx)
              </a>
            </div>
          </div>
          
          <div className="dokument-content">
            {!isEditingDoc ? (
              // Lesemodus
              <div className="dokument-read">
                <div className="dokument-info-box">
                  <p>💡 <strong>Tipp:</strong> Klicken Sie auf "Bearbeiten", um eigene Notizen, 
                  Buchungsbestätigungen oder Änderungen direkt im Dokument einzutragen!</p>
                </div>
                {editedDocument.map((para, idx) => {
                  const normalized = para.trimStart();
                  const isHeader = normalized.match(/^\d{2}\.\d{2}/) || normalized.includes('Vormittag') || normalized.includes('Nachmittag') || normalized.includes('Abend');
                  const isDay = normalized.match(/^\d{2}\.\d{2}/);
                  const bulletMatch = normalized.match(/^([\-•*]|)\s*(.+)$/);
                  const isBullet = Boolean(bulletMatch) && !isDay;
                  const displayText = isBullet ? bulletMatch[2] : normalized;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`doc-paragraph ${isDay ? 'day-header' : ''} ${isHeader ? 'section-header' : ''} ${isBullet ? 'bullet' : ''}`}
                    >
                      {isBullet ? (
                        <>
                          <span className="doc-bullet">•</span>
                          <span className="doc-bullet-text">{displayText}</span>
                        </>
                      ) : (
                        displayText
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Bearbeitungsmodus
              <div className="dokument-edit">
                <div className="edit-info">
                  <p>✏️ <strong>Bearbeitungsmodus aktiv</strong> - Ihre Änderungen werden automatisch 
                  im Browser gespeichert. Klicken Sie auf "Exportieren", um eine Textdatei zu erstellen.</p>
                </div>
                {editedDocument.map((para, idx) => {
                  const normalized = para.trimStart();
                  const isHeader = normalized.match(/^\d{2}\.\d{2}/) || normalized.includes('Vormittag') || normalized.includes('Nachmittag') || normalized.includes('Abend');
                  
                  return (
                    <div key={idx} className="edit-paragraph">
                      {isHeader ? (
                        <input
                          type="text"
                          className="edit-input header"
                          value={normalized}
                          onChange={(e) => updateDocumentParagraph(idx, e.target.value)}
                        />
                      ) : (
                        <textarea
                          className="edit-textarea"
                          value={normalized}
                          onChange={(e) => updateDocumentParagraph(idx, e.target.value)}
                          rows={Math.max(2, Math.ceil(normalized.length / 80))}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="dokument-features">
              <h3>📋 Was Sie hier finden:</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <span className="feature-icon">🕐</span>
                  <div>
                    <strong>Detaillierte Zeitpläne</strong>
                    <p>Vormittag, Nachmittag, Abend für jeden Tag</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🍽️</span>
                  <div>
                    <strong>Restaurant-Tipps</strong>
                    <p>Lokale Empfehlungen & Food Spots</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎫</span>
                  <div>
                    <strong>Tickets & Preise</strong>
                    <p>Eintrittspreise und Buchungshinweise</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🚌</span>
                  <div>
                    <strong>Transport-Infos</strong>
                    <p>Bus, Metro, Uber, Touren</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📸</span>
                  <div>
                    <strong>Foto-Spots</strong>
                    <p>Beste Orte für Erinnerungsfotos</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⚠️</span>
                  <div>
                    <strong>Wichtige Hinweise</strong>
                    <p>Öffnungszeiten, Ruhetage, Tipps</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="summary">
          <h3>📊 Reise-Statistik</h3>
          <div className="stats">
            <div className="stat">
              <strong>12 Tage</strong>
              <span>Mexiko-Stadt</span>
            </div>
            <div className="stat">
              <strong>9 Tage</strong>
              <span>Karibikküste</span>
            </div>
            <div className="stat">
              <strong>~1.800 km</strong>
              <span>Gesamt (ohne Flüge)</span>
            </div>
          </div>
        </div>
        <p style={{marginTop: '20px', fontSize: '14px', color: '#666'}}>
          Erstellt für Holger & Anabel • Viel Spaß in Mexiko! 🌮🏖️
        </p>
      </footer>
    </div>
  );
}

export default App;
