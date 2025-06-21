// Simulierte Benutzerdaten
const currentUser = {
  id: 1,
  name: "Max Mustermann",
  email: "max@mustermann.de",
  farm: "Musterhof GmbH",
  plz: "12345",
  location: "Musterstadt"
};

// DOM-Elemente
const appContainer = document.getElementById('app-container');
const usernameElement = document.getElementById('username');
const navLinks = document.querySelectorAll('nav a');
const addFieldBtn = document.getElementById('add-field-btn');
const fieldsTableBody = document.getElementById('fields-table-body');

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
  // Datum anzeigen
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  
  // Benutzerdaten anzeigen
  usernameElement.textContent = currentUser.name;
  
  // Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = this.getAttribute('href').substring(1);
      showSection(target);
      
      // Feldkarte initialisieren, wenn Felderbereich geöffnet wird
      if (target === 'fields') {
        initFieldMap();
      }
    });
  });
  
  // Direkt die App anzeigen
  showApp();
});

// App anzeigen
function showApp() {
  appContainer.classList.remove('hidden');
  
  // Dashboard als Standard anzeigen
  showSection('dashboard');
}

// Abschnitt anzeigen
function showSection(sectionId) {
  // Alle Abschnitte ausblenden
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.add('hidden');
  });
  
  // Gewünschten Abschnitt anzeigen
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
  }
  
  // Navigation aktualisieren
  navLinks.forEach(link => {
    link.parentElement.classList.remove('active');
    if (link.getAttribute('href') === `#${sectionId}`) {
      link.parentElement.classList.add('active');
    }
  });
}

// Feldkarte initialisieren
function initFieldMap() {
  if (!document.getElementById('field-map-container')) return;
  
  mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA';
  
  const map = new mapboxgl.Map({
    container: 'field-map-container',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: [13.404954, 52.520008],
    zoom: 12
  });
  
  // Felder als Polygone darstellen
  map.on('load', () => {
    // Nordfeld
    map.addSource('nordfeld', {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'Polygon',
          'coordinates': [[
            [13.38, 52.53],
            [13.40, 52.53],
            [13.40, 52.51],
            [13.38, 52.51],
            [13.38, 52.53]
          ]]
        }
      }
    });
    
    map.addLayer({
      'id': 'nordfeld',
      'type': 'fill',
      'source': 'nordfeld',
      'layout': {},
      'paint': {
        'fill-color': '#4CAF50',
        'fill-opacity': 0.5
      }
    });
    
    // Südfeld
    map.addSource('suedfeld', {
      'type': 'geojson',
      'data': {
        'type': 'Feature',
        'properties': {},
        'geometry': {
          'type': 'Polygon',
          'coordinates': [[
            [13.42, 52.50],
            [13.44, 52.50],
            [13.44, 52.48],
            [13.42, 52.48],
            [13.42, 52.50]
          ]]
        }
      }
    });
    
    map.addLayer({
      'id': 'suedfeld',
      'type': 'fill',
      'source': 'suedfeld',
      'layout': {},
      'paint': {
        'fill-color': '#FF9800',
        'fill-opacity': 0.5
      }
    });
    
    // Popup für Felder
    map.on('click', 'nordfeld', (e) => {
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML('<h3>Nordfeld</h3><p>Größe: 42.5 ha</p><p>Aktuelle Kultur: Weizen</p>')
        .addTo(map);
    });
    
    map.on('click', 'suedfeld', (e) => {
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML('<h3>Südfeld</h3><p>Größe: 38.2 ha</p><p>Aktuelle Kultur: Mais</p>')
        .addTo(map);
    });
  });
}

// Benachrichtigung anzeigen
function showNotification(message, type = 'info') {
  const container = document.querySelector('.notification-container');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      ${message}
    </div>
  `;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      container.removeChild(notification);
    }, 300);
  }, 5000);
}