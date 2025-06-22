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
const aiChatMessages = document.querySelector('.ai-chat-messages');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiQuestion = document.getElementById('ai-question');
const addFieldBtn = document.getElementById('add-field-btn');
const fieldsTableBody = document.getElementById('fields-table-body');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const farmDetailsForm = document.getElementById('farm-details-form');
const addFieldForm = document.getElementById('add-field-form');
const addMachineryForm = document.getElementById('add-machinery-form');
const addPersonnelForm = document.getElementById('add-personnel-form');
const fieldsContainer = document.getElementById('fields-container');
const machineryContainer = document.getElementById('machinery-container');
const personnelContainer = document.getElementById('personnel-container');
const drawPolygonBtn = document.getElementById('draw-polygon');
const deletePolygonBtn = document.getElementById('delete-polygon');
const fieldModal = document.getElementById('field-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');
const confirmFieldBtn = document.getElementById('confirm-field');
const modalFieldName = document.getElementById('modal-field-name');
const modalFieldCrop = document.getElementById('modal-field-crop');
const modalFieldNotes = document.getElementById('modal-field-notes');
const modalFieldSize = document.getElementById('modal-field-size');
const modalPlantingDate = document.getElementById('modal-planting-date');
const modalSoilType = document.getElementById('modal-soil-type');

// Leaflet Variablen
let map;
let drawnItems;
let currentPolygon = null;
let currentArea = 0;
let polygonDrawer = null;

// Initialisierung
function initFieldMap() {
  const mapContainer = document.getElementById('field-map-container');
  if (!mapContainer) return;
  // Verhindere Mehrfach-Initialisierung
  if (map && map._container === mapContainer) {
    map.invalidateSize();
    return;
  }
  if (map) {
    map.remove();
    map = null;
  }
  map = L.map('field-map-container').setView([51.1657, 10.4515], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // DrawControl nur für Editieren
  const drawControl = new L.Control.Draw({
    position: 'topright',
    draw: false,
    edit: {
      featureGroup: drawnItems
    }
  });
  map.addControl(drawControl);

  // Event für das eigentliche Zeichnen
  map.on(L.Draw.Event.CREATED, (e) => {
    drawnItems.clearLayers();
    const layer = e.layer;
    currentPolygon = layer;
    currentArea = (L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 10000);
    modalFieldSize.value = currentArea.toFixed(2);
    fieldModal.style.display = 'block';
    drawnItems.addLayer(layer);
  });

  // Button-Handler für Zeichnen
  if (drawPolygonBtn) {
    drawPolygonBtn.onclick = () => {
      if (polygonDrawer) polygonDrawer.disable();
      polygonDrawer = new L.Draw.Polygon(map, {
        shapeOptions: {
          color: '#4CAF50',
          fillColor: '#4CAF50',
          fillOpacity: 0.3
        }
      });
      polygonDrawer.enable();
    };
  }
  // Button-Handler für Löschen
  if (deletePolygonBtn) {
    deletePolygonBtn.onclick = () => {
      drawnItems.clearLayers();
      currentPolygon = null;
      currentArea = 0;
      modalFieldSize.value = '0';
    };
  }
  loadFieldsOnMap();
}

document.addEventListener('DOMContentLoaded', () => {
  usernameElement.textContent = currentUser.name;

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = this.getAttribute('href').substring(1);
      showSection(target);
      if (target === 'fields') {
        initFieldMap();
      }
    });
  });

  if (aiSendBtn && aiQuestion) {
    aiSendBtn.addEventListener('click', sendAIMessage);
    aiQuestion.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendAIMessage();
      }
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  if (farmDetailsForm) {
    farmDetailsForm.addEventListener('submit', saveFarmDetails);
  }
  if (addFieldForm) {
    addFieldForm.addEventListener('submit', addField);
  }
  if (addMachineryForm) {
    addMachineryForm.addEventListener('submit', addMachinery);
  }
  if (addPersonnelForm) {
    addPersonnelForm.addEventListener('submit', addPersonnel);
  }
  if (addFieldBtn) {
    addFieldBtn.addEventListener('click', () => {
      showSection('fields');
      setTimeout(() => {
        if (drawPolygonBtn) drawPolygonBtn.click();
      }, 300);
    });
  }
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fieldModal.style.display = 'none';
    });
  });
  if (confirmFieldBtn) {
    confirmFieldBtn.addEventListener('click', saveFieldFromModal);
  }
  loadFarmData();
  loadFields();
  loadMachinery();
  loadPersonnel();
  showApp();
});

function showApp() {
  appContainer.classList.remove('hidden');
  showSection('dashboard');
}

function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.add('hidden');
  });
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('hidden');
  }
  navLinks.forEach(link => {
    link.parentElement.classList.remove('active');
    if (link.getAttribute('href') === `#${sectionId}`) {
      link.parentElement.classList.add('active');
    }
  });
}

async function loadFieldsOnMap() {
  if (!map || !drawnItems) return;
  drawnItems.clearLayers();
  try {
    const response = await fetch('/.netlify/functions/getFields');
    if (!response.ok) throw new Error('Fehler beim Laden der Felder');
    const data = await response.json();
    const fields = data.fields || [];
    fields.forEach(field => {
      if (field.coordinates) {
        const polygon = L.polygon(field.coordinates, {
          color: '#4CAF50',
          fillColor: '#4CAF50',
          fillOpacity: 0.3
        });
        polygon.bindPopup(`
          <b>${field.name}</b><br>
          Größe: ${field.size} ha<br>
          Kultur: ${getCropName(field.crop)}<br>
          ${field.notes ? `Notizen: ${field.notes}` : ''}
        `);
        polygon.addTo(map);
        drawnItems.addLayer(polygon);
      }
    });
  } catch (error) {
    // Fehler beim Laden der Felder auf der Karte ignorieren
  }
}

async function saveFieldFromModal() {
  if (!modalFieldName.value) {
    showNotification('Bitte geben Sie einen Feldnamen ein', 'error');
    return;
  }
  if (confirmFieldBtn) confirmFieldBtn.disabled = true;
  if (!modalPlantingDate.value) {
    showNotification('Bitte ein Pflanzdatum auswählen!', 'error');
    if (confirmFieldBtn) confirmFieldBtn.disabled = false;
    return;
  }
  const plantingDateISO = new Date(modalPlantingDate.value).toISOString().slice(0, 10);
  const fieldData = {
    name: modalFieldName.value,
    crop: modalFieldCrop.value,
    notes: modalFieldNotes.value,
    size: currentArea ? currentArea.toFixed(2) : '',
    coordinates: currentPolygon ? currentPolygon.getLatLngs()[0].map(ll => [ll.lat, ll.lng]) : [],
    status: 'Wachstum',
    plantingDate: plantingDateISO,
    soilType: modalSoilType.value
  };
  try {
    const response = await fetch('/.netlify/functions/saveField', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldData)
    });
    if (!response.ok) throw new Error('Fehler beim Speichern des Feldes');
    showNotification('Feld erfolgreich gespeichert!', 'success');
    fieldModal.style.display = 'none';
    modalFieldName.value = '';
    modalFieldNotes.value = '';
    modalPlantingDate.value = '';
    currentPolygon = null;
    await loadFields();
    if (typeof loadFieldsOnMap === 'function') await loadFieldsOnMap();
  } catch (error) {
    showNotification('Fehler beim Speichern des Feldes', 'error');
  } finally {
    if (confirmFieldBtn) confirmFieldBtn.disabled = false;
  }
}

// ... (Rest wie gehabt, keine Änderung an den anderen Funktionen)
