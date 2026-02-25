// ============================================
// MEXIKO REISE 2025 - CLOUD BACKEND
// Google Apps Script für Multi-User Collaboration
// ============================================

// WICHTIG: Nach jeder Änderung neu deployen!
// "Bereitstellen" → "Neue Bereitstellung" → URL kopieren

// Spreadsheet ID - HIER IHRE GOOGLE SHEETS ID EINTRAGEN
const SHEET_ID = 'IHRE_SPREADSHEET_ID_HIER';

// doGet - Daten abrufen
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getNotes') {
      return getAllNotes();
    } else if (action === 'getDocument') {
      return getDocument();
    } else if (action === 'getAll') {
      return getAllData();
    }
    
    return jsonResponse({ status: 'error', message: 'Unbekannte Aktion' });
  } catch (error) {
    console.error('doGet Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// doPost - Daten speichern
function doPost(e) {
  try {
    if (!e || !e.postData) {
      return jsonResponse({ status: 'error', message: 'Keine Daten empfangen' });
    }
    
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      data = e.parameter;
    }
    
    console.log('Empfangene Daten:', JSON.stringify(data));
    
    const action = data.action;
    
    if (action === 'saveNote') {
      return saveNote(data.day, data.note, data.user);
    } else if (action === 'saveDocument') {
      return saveDocument(data.paragraphs, data.user);
    } else if (action === 'deleteNote') {
      return deleteNote(data.day);
    }
    
    return jsonResponse({ status: 'error', message: 'Unbekannte Aktion' });
  } catch (error) {
    console.error('doPost Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// Notiz speichern
function saveNote(day, note, user) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Notizen');
    
    if (!sheet) {
      sheet = ss.insertSheet('Notizen');
      sheet.appendRow(['Tag', 'Notiz', 'Benutzer', 'Zeitstempel']);
    }
    
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    // Bestehende Notiz aktualisieren
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == day) {
        sheet.getRange(i + 1, 2).setValue(note);
        sheet.getRange(i + 1, 3).setValue(user);
        sheet.getRange(i + 1, 4).setValue(new Date());
        found = true;
        break;
      }
    }
    
    // Neue Notiz erstellen
    if (!found) {
      sheet.appendRow([day, note, user, new Date()]);
    }
    
    return jsonResponse({ 
      status: 'success', 
      message: 'Notiz gespeichert',
      day: day 
    });
  } catch (error) {
    console.error('saveNote Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// Alle Notizen abrufen
function getAllNotes() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Notizen');
    
    if (!sheet) {
      return jsonResponse({ status: 'success', notes: {} });
    }
    
    const data = sheet.getDataRange().getValues();
    const notes = {};
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        notes[data[i][0]] = {
          text: data[i][1],
          user: data[i][2] || 'Unbekannt',
          timestamp: data[i][3] || ''
        };
      }
    }
    
    return jsonResponse({ status: 'success', notes: notes });
  } catch (error) {
    console.error('getAllNotes Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// Notiz löschen
function deleteNote(day) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Notizen');
    
    if (!sheet) {
      return jsonResponse({ status: 'error', message: 'Keine Notizen vorhanden' });
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == day) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ status: 'success', message: 'Notiz gelöscht' });
      }
    }
    
    return jsonResponse({ status: 'error', message: 'Notiz nicht gefunden' });
  } catch (error) {
    console.error('deleteNote Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// Dokument speichern
function saveDocument(paragraphs, user) {
  try {
    // Frontend kann paragraphs als Array ODER JSON-String senden.
    if (typeof paragraphs === 'string') {
      try {
        paragraphs = JSON.parse(paragraphs);
      } catch (e) {
        return jsonResponse({ status: 'error', message: 'Ungültiges paragraphs-Format (JSON erwartet)' });
      }
    }

    if (!Array.isArray(paragraphs)) {
      return jsonResponse({ status: 'error', message: 'paragraphs muss ein Array sein' });
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Dokument');
    
    if (!sheet) {
      sheet = ss.insertSheet('Dokument');
    }
    
    // Sheet leeren
    sheet.clear();
    sheet.appendRow(['Index', 'Text', 'Benutzer', 'Zeitstempel']);
    
    // Alle Paragraphen speichern
    for (let i = 0; i < paragraphs.length; i++) {
      sheet.appendRow([i, paragraphs[i], user, new Date()]);
    }
    
    return jsonResponse({ 
      status: 'success', 
      message: 'Dokument gespeichert',
      count: paragraphs.length 
    });
  } catch (error) {
    console.error('saveDocument Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// Dokument abrufen
function getDocument() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Dokument');
    
    if (!sheet) {
      return jsonResponse({ status: 'success', paragraphs: [] });
    }
    
    const data = sheet.getDataRange().getValues();
    const paragraphs = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) {
        paragraphs.push(data[i][1]);
      }
    }
    
    return jsonResponse({ 
      status: 'success', 
      paragraphs: paragraphs,
      lastUser: data.length > 1 ? data[1][2] : '',
      lastUpdate: data.length > 1 ? data[1][3] : ''
    });
  } catch (error) {
    console.error('getDocument Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// Alle Daten abrufen (für Sync)
function getAllData() {
  try {
    const notesResponse = JSON.parse(getAllNotes().getContent());
    const docResponse = JSON.parse(getDocument().getContent());
    
    return jsonResponse({
      status: 'success',
      notes: notesResponse.notes || {},
      document: docResponse.paragraphs || [],
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('getAllData Fehler:', error);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

// JSON Response Helper
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test-Funktion (im Apps Script Editor ausführen)
function testScript() {
  console.log('Test: Notiz speichern');
  const result = saveNote(1, 'Test Notiz', 'Test User');
  console.log(result.getContent());
  
  console.log('Test: Notizen abrufen');
  const notes = getAllNotes();
  console.log(notes.getContent());
}
