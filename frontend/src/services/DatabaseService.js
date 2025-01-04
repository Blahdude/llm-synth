class DatabaseService {
  constructor() {
    this.dbName = 'musicgenDB';
    this.dbVersion = 1;
    this.audioStoreName = 'audioFiles';
    this.userStoreName = 'users';
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create audio files store
        if (!db.objectStoreNames.contains(this.audioStoreName)) {
          const audioStore = db.createObjectStore(this.audioStoreName, { keyPath: 'id' });
          audioStore.createIndex('userId', 'userId', { unique: false });
          audioStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create users store
        if (!db.objectStoreNames.contains(this.userStoreName)) {
          const userStore = db.createObjectStore(this.userStoreName, { keyPath: 'username' });
          userStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveAudioGeneration(userId, audioBlob, metadata) {
    const db = await this.initDB();
    const id = `${userId}_${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.audioStoreName], 'readwrite');
      const store = transaction.objectStore(this.audioStoreName);

      // Convert Blob to ArrayBuffer before storing
      const reader = new FileReader();
      reader.onload = () => {
        const audioData = {
          id,
          userId,
          audioBuffer: reader.result,  // Store as ArrayBuffer
          mimeType: audioBlob.type,    // Store the MIME type
          ...metadata,
          timestamp: new Date().toISOString()
        };

        const request = store.add(audioData);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  async getUserGenerations(userId) {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.audioStoreName], 'readonly');
      const store = transaction.objectStore(this.audioStoreName);
      const index = store.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));
      
      request.onsuccess = () => {
        // Convert ArrayBuffer back to Blob for each result
        const results = request.result.map(item => ({
          ...item,
          audioBlob: new Blob([item.audioBuffer], { type: item.mimeType })
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteGeneration(id) {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.audioStoreName], 'readwrite');
      const store = transaction.objectStore(this.audioStoreName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAudioFile(id) {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.audioStoreName], 'readonly');
      const store = transaction.objectStore(this.audioStoreName);
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error('Audio file not found'));
          return;
        }
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getGeneration(generationId) {
    try {
      const docRef = doc(db, 'generations', generationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching generation:', error);
      throw error;
    }
  }
}

export const dbService = new DatabaseService(); 