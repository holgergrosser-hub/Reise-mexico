// ============================================
// CLOUD API SERVICE
// Verbindung zu Google Apps Script Backend
// ============================================

// WICHTIG: Diese URL nach Deployment des Google Apps Scripts eintragen!
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/IHRE_DEPLOYMENT_ID/exec';

class CloudAPI {
  constructor() {
    this.url = APPS_SCRIPT_URL;
    this.userName = this.getUserName();
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
      const formData = new FormData();
      formData.append('action', 'saveNote');
      formData.append('day', day);
      formData.append('note', note);
      formData.append('user', this.userName);

      const response = await fetch(this.url, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
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
      const response = await fetch(`${this.url}?action=getNotes`);
      const data = await response.json();
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
      const formData = new FormData();
      formData.append('action', 'deleteNote');
      formData.append('day', day);

      const response = await fetch(this.url, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
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
      const formData = new FormData();
      formData.append('action', 'saveDocument');
      formData.append('paragraphs', JSON.stringify(paragraphs));
      formData.append('user', this.userName);

      const response = await fetch(this.url, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
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
      const response = await fetch(`${this.url}?action=getDocument`);
      const data = await response.json();
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
      const response = await fetch(`${this.url}?action=getAll`);
      const data = await response.json();
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
      const response = await fetch(`${this.url}?action=getAll`, {
        signal: AbortSignal.timeout(5000) // 5 Sekunden Timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Verbindung fehlgeschlagen:', error);
      return false;
    }
  }
}

export default CloudAPI;
