import React, { useState, useEffect } from 'react';
import './App.css';
import reiseplanData from './reiseplan-text.json';
import CloudAPI from './cloudAPI';
import WeatherAPI from './weatherAPI';

function App() {
  const [selectedDay, setSelectedDay] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [notes, setNotes] = useState({});
  const [activeTab, setActiveTab] = useState('karte');
  const [editedDocument, setEditedDocument] = useState(reiseplanData.paragraphs);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [filteredDay, setFilteredDay] = useState(null); // Für Kartenfilter
  
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
  const [weatherForecast, setWeatherForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Initialer Sync beim Start
  useEffect(() => {
    const initSync = async () => {
      if (syncMode === 'cloud') {
        const online = await cloudAPI.checkConnection();
        setIsOnline(online);
        
        if (online) {
          await syncFromCloud();
        } else {
          // Fallback auf lokale Daten
          loadLocalData();
        }
      } else {
        loadLocalData();
      }
    };
    
    initSync();
    
    // Auto-Sync alle 30 Sekunden
    const interval = setInterval(() => {
      if (syncMode === 'cloud' && isOnline) {
        syncFromCloud();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [syncMode]);

  // Lokale Daten laden
  const loadLocalData = () => {
    const savedNotes = localStorage.getItem('mexiko-reise-notizen');
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    
    const savedDoc = localStorage.getItem('mexiko-reise-dokument');
    if (savedDoc) setEditedDocument(JSON.parse(savedDoc));
  };

  // Von Cloud synchronisieren
  const syncFromCloud = async () => {
    try {
      setIsSyncing(true);
      const data = await cloudAPI.syncAll();
      
      if (data.status === 'success') {
        // Notizen aktualisieren
        if (data.notes) {
          const notesObj = {};
          Object.keys(data.notes).forEach(key => {
            notesObj[key] = data.notes[key].text;
          });
          setNotes(notesObj);
        }
        
        // Dokument aktualisieren
        if (data.document && data.document.length > 0) {
          setEditedDocument(data.document);
        }
        
        setLastSync(new Date());
        setIsOnline(true);
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
    setNotes(prev => ({
      ...prev,
      [day]: text
    }));
    
    // Cloud-Sync
    if (syncMode === 'cloud' && isOnline) {
      await cloudAPI.saveNote(day, text);
    }
  };

  const exportNotes = () => {
    const text = Object.entries(notes)
      .map(([day, note]) => {
        const tagData = reiseDaten.find(t => t.tag === parseInt(day));
        return `Tag ${day} - ${tagData?.datum} - ${tagData?.title}\n${note}\n\n`;
      })
      .join('---\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mexiko-reise-notizen.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateDocumentParagraph = (index, text) => {
    setEditedDocument(prev => {
      const newDoc = [...prev];
      newDoc[index] = text;
      return newDoc;
    });
  };

  const saveDocumentToCloud = async () => {
    if (syncMode === 'cloud' && isOnline) {
      setIsSyncing(true);
      const result = await cloudAPI.saveDocument(editedDocument);
      setIsSyncing(false);
      
      if (result.status === 'success') {
        alert('✅ Dokument in Cloud gespeichert!');
      } else {
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

  // Reisedaten mit allen Orten und Fahrzeiten
  const reiseDaten = [
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
        { name: "Zócalo", lat: 19.4324051, lng: -99.134078, zeit: "09:00", dauer: "2h", entfernung: "5 km / 12 Min von Roma" },
        { name: "Templo Mayor Museum", lat: 19.4346038, lng: -99.131881, zeit: "11:00", dauer: "2h", entfernung: "300m / 1 Min" },
        { name: "Torre Latinoamericana", lat: 19.4338974, lng: -99.1406461, zeit: "18:00", dauer: "2h", entfernung: "1 km / 4 Min" },
        { name: "Plaza Garibaldi", lat: 19.440413, lng: -99.1392564, zeit: "20:00", dauer: "2h", entfernung: "800m / 3 Min" }
      ],
      beschreibung: "Fahnenzeremonie 8 Uhr, Kathedrale, Diego Rivera Murals, Mariachi-Musik"
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

  // Google Maps laden
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBUsUSRoOm470zE64np1xLay1WxAQTcF3g&libraries=geometry,places`;
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

        // Google Places Service für echte Fotos
        const placesService = new window.google.maps.places.PlacesService(map);
        const request = {
          query: ort.name + ', Mexico City',
          fields: ['photos', 'formatted_address', 'name', 'rating', 'opening_hours']
        };

        // Bessere Bilder: Unsplash mit Mexiko-spezifischen Keywords
        const searchTerm = ort.name.replace(/\s+/g, '+');
        let imageUrl = `https://source.unsplash.com/400x250/?${searchTerm},mexico,landmark`;
        
        // Versuche echtes Foto von Google Places zu laden
        placesService.findPlaceFromQuery(request, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results[0]?.photos) {
            imageUrl = results[0].photos[0].getUrl({ maxWidth: 400, maxHeight: 250 });
          }
        });

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

        const infoContent = `
          <div style="padding: 10px; min-width: 250px; max-width: 350px;">
            <div style="margin-bottom: 10px;">
              <img src="${imageUrl}" 
                   style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"
                   alt="${ort.name}"
                   onerror="this.src='https://source.unsplash.com/400x250/?mexico+city,travel'">
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

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          infoWindows.forEach(iw => iw.close());
          infoWindow.open(map, marker);
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
      const current = await weatherAPI.getCurrentWeather('Mexico City');
      const forecast = await weatherAPI.getForecast('Mexico City');
      setCurrentWeather(current);
      setWeatherForecast(forecast);
      setWeatherLoading(false);
    };
    
    loadWeather();
  }, []);

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
            {currentWeather && !weatherLoading && (
              <div className="weather-widget" title="Aktuelles Wetter in Mexiko-Stadt">
                <img 
                  src={weatherAPI.getIconUrl(currentWeather.icon)} 
                  alt="Wetter"
                  style={{width: '50px', height: '50px'}}
                />
                <div className="weather-info">
                  <div className="weather-temp">{currentWeather.temp}°C</div>
                  <div className="weather-desc">{currentWeather.description}</div>
                </div>
              </div>
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
                  
                  <button className="sync-btn" onClick={syncFromCloud} disabled={!isOnline || isSyncing}>
                    🔄 Jetzt sync
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
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
            📝 Notizen {Object.keys(notes).length > 0 && `(${Object.keys(notes).length})`}
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

                <div className="orte-liste">
                  {tag.orte.map((ort, idx) => (
                    <div key={idx} className="ort-item">
                      <div className="ort-header">
                        <span className="ort-zeit">🕐 {ort.zeit}</span>
                        <strong>{ort.name}</strong>
                      </div>
                      <div className="ort-details">
                        <span>⏱️ {ort.dauer}</span>
                        {ort.entfernung && <span className="entfernung">🚗 {ort.entfernung}</span>}
                      </div>
                    </div>
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
                  <div key={idx} className="timeline-ort">
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

              {notes[tag.tag] && (
                <div className="note-preview">
                  📝 <em>{notes[tag.tag].substring(0, 100)}{notes[tag.tag].length > 100 ? '...' : ''}</em>
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
                
                <textarea
                  className="notiz-textarea"
                  placeholder="Hier können Sie Ihre Notizen, Ideen, Buchungen etc. eintragen..."
                  value={notes[tag.tag] || ''}
                  onChange={(e) => updateNote(tag.tag, e.target.value)}
                  rows={4}
                />
                
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
                  const isHeader = para.match(/^\d{2}\.\d{2}/) || para.includes('Vormittag') || para.includes('Nachmittag') || para.includes('Abend');
                  const isDay = para.match(/^\d{2}\.\d{2}/);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`doc-paragraph ${isDay ? 'day-header' : ''} ${isHeader ? 'section-header' : ''}`}
                    >
                      {para}
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
                  const isHeader = para.match(/^\d{2}\.\d{2}/) || para.includes('Vormittag') || para.includes('Nachmittag') || para.includes('Abend');
                  
                  return (
                    <div key={idx} className="edit-paragraph">
                      {isHeader ? (
                        <input
                          type="text"
                          className="edit-input header"
                          value={para}
                          onChange={(e) => updateDocumentParagraph(idx, e.target.value)}
                        />
                      ) : (
                        <textarea
                          className="edit-textarea"
                          value={para}
                          onChange={(e) => updateDocumentParagraph(idx, e.target.value)}
                          rows={Math.max(2, Math.ceil(para.length / 80))}
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
