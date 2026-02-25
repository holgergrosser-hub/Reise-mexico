// ============================================
// CLOUD API SERVICE
// Verbindung zu Google Apps Script Backend
// ============================================

// Apps Script Web-App URL (Netlify/Vite Env): VITE_APPS_SCRIPT_URL
// Fallback ist leer -> Cloud-Sync bleibt offline.
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

function isConfiguredAppsScriptUrl(url) {
  return Boolean(url) && !url.includes('IHRE_DEPLOYMENT_ID');
}

async function safeReadJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      status: 'error',
      message: 'Antwort ist kein JSON (prüfe Apps-Script Deployment/URL/Zugriff)',
      httpStatus: response.status,
      preview: text.slice(0, 200)
    };
  }
}

class CloudAPI {
  constructor() {
    this.url = APPS_SCRIPT_URL;
    this.userName = this.getUserName();
  }

  buildFormBody(payload) {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      params.append(key, typeof value === 'string' ? value : String(value));
    });
    return params;
  }

  // Benutzername verwalten
  getUserName() {
    let userName = localStorage.getItem('mexiko-user-name');
    if (!userName) {
      userName = prompt('Wie ist Ihr Name?', 'Reisender') || 'Anonym';
      localStorage.setItem('mexiko-user-name', userName);
    }
    return userName;
  }

  setUserName(name) {
    this.userName = name;
    localStorage.setItem('mexiko-user-name', name);
  }

  // Notiz speichern
  async saveNote(day, note) {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) {
        return { status: 'error', message: 'Cloud-Sync nicht konfiguriert (VITE_APPS_SCRIPT_URL fehlt)' };
      }

      const body = this.buildFormBody({
        action: 'saveNote',
        day,
        note,
        user: this.userName
      });

      const response = await fetch(this.url, {
        method: 'POST',
        body
      });

      const data = await safeReadJson(response);
      console.log('Notiz gespeichert:', data);
      return data;
    } catch (error) {
      console.error('Fehler beim Speichern der Notiz:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Alle Notizen abrufen
  async getAllNotes() {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) {
        return { status: 'error', message: 'Cloud-Sync nicht konfiguriert (VITE_APPS_SCRIPT_URL fehlt)' };
      }
      const response = await fetch(`${this.url}?action=getNotes`);
      const data = await safeReadJson(response);
      console.log('Notizen abgerufen:', data);
      return data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Notizen:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Notiz löschen
  async deleteNote(day) {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) {
        return { status: 'error', message: 'Cloud-Sync nicht konfiguriert (VITE_APPS_SCRIPT_URL fehlt)' };
      }

      const body = this.buildFormBody({
        action: 'deleteNote',
        day
      });

      const response = await fetch(this.url, {
        method: 'POST',
        body
      });

      const data = await safeReadJson(response);
      console.log('Notiz gelöscht:', data);
      return data;
    } catch (error) {
      console.error('Fehler beim Löschen der Notiz:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Dokument speichern
  async saveDocument(paragraphs) {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) {
        return { status: 'error', message: 'Cloud-Sync nicht konfiguriert (VITE_APPS_SCRIPT_URL fehlt)' };
      }

      const body = this.buildFormBody({
        action: 'saveDocument',
        // Apps Script empfängt über e.parameter typischerweise Strings.
        // Backend kann JSON-String oder Array verarbeiten.
        paragraphs: JSON.stringify(paragraphs),
        user: this.userName
      });

      const response = await fetch(this.url, {
        method: 'POST',
        body
      });

      const data = await safeReadJson(response);
      console.log('Dokument gespeichert:', data);
      return data;
    } catch (error) {
      console.error('Fehler beim Speichern des Dokuments:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Dokument abrufen
  async getDocument() {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) {
        return { status: 'error', message: 'Cloud-Sync nicht konfiguriert (VITE_APPS_SCRIPT_URL fehlt)' };
      }
      const response = await fetch(`${this.url}?action=getDocument`);
      const data = await safeReadJson(response);
      console.log('Dokument abgerufen:', data);
      return data;
    } catch (error) {
      console.error('Fehler beim Abrufen des Dokuments:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Alle Daten abrufen (Sync)
  async syncAll() {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) {
        return { status: 'error', message: 'Cloud-Sync nicht konfiguriert (VITE_APPS_SCRIPT_URL fehlt)' };
      }
      const response = await fetch(`${this.url}?action=getAll`);
      const data = await safeReadJson(response);
      console.log('Alle Daten synchronisiert:', data);
      return data;
    } catch (error) {
      console.error('Fehler beim Synchronisieren:', error);
      return { status: 'error', message: error.message };
    }
  }

  // Online-Status prüfen
  async checkConnection() {
    try {
      if (!isConfiguredAppsScriptUrl(this.url)) return false;

      const options = {};
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        options.signal = AbortSignal.timeout(5000); // 5 Sekunden Timeout
      }

      const response = await fetch(`${this.url}?action=getAll`, options);
      if (!response.ok) return false;

      // Stelle sicher, dass wir wirklich JSON bekommen (nicht Login/HTML).
      const data = await safeReadJson(response);
      return data?.status === 'success';
    } catch (error) {
      console.error('Verbindung fehlgeschlagen:', error);
      return false;
    }
  }
}

export default CloudAPI;
