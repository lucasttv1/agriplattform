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

// Leaflet Variablen
let map;
let drawnItems;
let currentPolygon = null;
let currentArea = 0;

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
      showSection('my-farm');
      document.querySelector('[data-tab="farm-fields"]').click();
    });
  }
  if (drawPolygonBtn) {
    drawPolygonBtn.addEventListener('click', () => {
      if (map) {
        new L.Draw.Polygon(map).enable();
      }
    });
  }
  if (deletePolygonBtn) {
    deletePolygonBtn.addEventListener('click', () => {
      if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
      }
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

function initFieldMap() {
  const mapContainer = document.getElementById('field-map-container');
  if (!mapContainer || map) return;
  map = L.map('field-map-container').setView([51.1657, 10.4515], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  const drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
      polygon: {
        shapeOptions: {
          color: '#4CAF50',
          fillColor: '#4CAF50',
          fillOpacity: 0.3
        }
      },
      polyline: false,
      rectangle: false,
      circle: false,
      circlemarker: false,
      marker: false
    },
    edit: {
      featureGroup: drawnItems
    }
  });
  map.addControl(drawControl);
  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    currentPolygon = layer;
    currentArea = (L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 10000);
    modalFieldSize.textContent = currentArea.toFixed(2);
    fieldModal.style.display = 'block';
    drawnItems.addLayer(layer);
  });
  loadFieldsOnMap();
}

function loadFieldsOnMap() {
  const fields = JSON.parse(localStorage.getItem('agriFields')) || [];
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
}

function saveFieldFromModal() {
  if (!currentPolygon || !modalFieldName.value) {
    showNotification('Bitte geben Sie einen Feldnamen ein und zeichnen Sie ein Feld', 'error');
    return;
  }
  const fieldData = {
    name: modalFieldName.value,
    crop: modalFieldCrop.value,
    notes: modalFieldNotes.value,
    size: currentArea.toFixed(2),
    coordinates: currentPolygon.getLatLngs()[0].map(ll => [ll.lat, ll.lng]),
    id: Date.now().toString()
  };
  const fields = JSON.parse(localStorage.getItem('agriFields')) || [];
  fields.push(fieldData);
  localStorage.setItem('agriFields', JSON.stringify(fields));
  fieldModal.style.display = 'none';
  modalFieldName.value = '';
  modalFieldNotes.value = '';
  currentPolygon = null;
  loadFields();
  showNotification('Feld erfolgreich gespeichert!', 'success');
}

function sendAIMessage() {
  const question = aiQuestion.value.trim();
  if (!question) return;
  addUserMessage(question);
  aiQuestion.value = '';
  setTimeout(() => {
    const aiResponse = generateAIResponse(question);
    addAIMessage(aiResponse);
  }, 1000);
}

function addUserMessage(text) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'user');
  messageElement.innerHTML = `
    <div class="message-content">
      <div class="message-sender">${currentUser.name.split(' ')[0]}</div>
      <div class="message-text user-message">${text}</div>
    </div>
    <div class="message-avatar">
      <i class="fas fa-user"></i>
    </div>
  `;
  aiChatMessages.appendChild(messageElement);
  scrollToBottom();
}

function addAIMessage(text) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', 'ai-message');
  messageElement.innerHTML = `
    <div class="message-avatar">
      <i class="fas fa-robot"></i>
    </div>
    <div class="message-content">
      <div class="message-sender">AgriSmart KI</div>
      <div class="message-text">${text}</div>
    </div>
  `;
  aiChatMessages.appendChild(messageElement);
  scrollToBottom();
}

function generateAIResponse(question) {
  const lowerQuestion = question.toLowerCase();
  if (lowerQuestion.includes('wetter') || lowerQuestion.includes('prognose')) {
    return "Die Wettervorhersage für die nächsten 7 Tage zeigt sonniges Wetter mit gelegentlichen Schauern. Die Temperaturen liegen zwischen 18°C und 25°C. Für dein Nordfeld empfehle ich Bewässerung am frühen Morgen.";
  }
  if (lowerQuestion.includes('ernte') || lowerQuestion.includes('weizen')) {
    return "Basierend auf der aktuellen Wachstumsphase und Wettervorhersage empfehle ich, die Weizenernte in etwa 10 Tagen durchzuführen. Der optimale Feuchtigkeitsgehalt liegt bei 14-15%.";
  }
  if (lowerQuestion.includes('düng') || lowerQuestion.includes('stickstoff')) {
    return "Die Bodenanalyse zeigt einen Stickstoffmangel. Ich empfehle 30kg/ha Ammoniumnitrat in den nächsten 5 Tagen auszubringen. Achte auf die Wettervorhersage, um Regen zu nutzen.";
  }
  if (lowerQuestion.includes('krankheit') || lowerQuestion.includes('mehltau')) {
    return "Die Symptome deuten auf Mehltau hin. Eine Behandlung mit Fungizid X in einer Dosierung von 2l/ha wird empfohlen. Anwendung am frühen Morgen bei trockenen Bedingungen.";
  }
  if (lowerQuestion.includes('bewässerung') || lowerQuestion.includes('wasser')) {
    return "Aufgrund der geringen Niederschläge und hohen Temperaturen empfehle ich eine zusätzliche Bewässerung von 20mm in dieser Woche. Ideal wäre eine Tröpfchenbewässerung für dein Maisfeld.";
  }
  if (lowerQuestion.includes('rap')) {
    return "Dein Raps auf der Westwiese ist in 5-7 Tagen erntebereit. Der Ölgehalt ist optimal bei der derzeitigen Witterung. Plane die Ernte für trockene Tage ein.";
  }
  if (lowerQuestion.includes('boden') || lowerQuestion.includes('analyse')) {
    return "Die letzte Bodenanalyse zeigt: pH-Wert 6.8 (optimal), Stickstoff 14 mg/kg (durchschnitt), Phosphor 8 mg/kg (optimal), Kalium 18 mg/kg (optimal).";
  }
  return "Das habe ich leider nicht verstanden. Bitte stelle deine Frage anders oder frage nach Ernte, Wetter, Düngung, Bewässerung oder Schädlingsbekämpfung.";
}

function scrollToBottom() {
  if (aiChatMessages) {
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }
}

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

// Dummy-Implementierungen für Datenfunktionen (können nach Bedarf angepasst werden)
function loadFarmData() {}

async function loadFields() {
  // Beide Bereiche holen
  const fieldsContainer = document.getElementById('fields-container');
  const fieldsTableBody = document.getElementById('fields-table-body');
  if (fieldsContainer) fieldsContainer.innerHTML = '<div class="loading">Lade Felder...</div>';
  if (fieldsTableBody) fieldsTableBody.innerHTML = '<tr><td colspan="5">Lade Felder...</td></tr>';
  try {
    const response = await fetch('/.netlify/functions/getFields');
    if (!response.ok) throw new Error('Fehler beim Laden der Felder');
    const data = await response.json();
    const fields = data.fields || [];

    // Bereich "Mein Betrieb > Felder"
    if (fieldsContainer) {
      fieldsContainer.innerHTML = '';
      if (!fields || fields.length === 0) {
        fieldsContainer.innerHTML = '<div class="no-data">Keine Felder vorhanden.</div>';
      } else {
        fields.forEach(field => {
          const card = document.createElement('div');
          card.className = 'farm-item-card';
          card.innerHTML = `
            <div class="farm-item-header">
              <div class="farm-item-name">${field.name}</div>
            </div>
            <div class="farm-item-details">
              <div><strong>Größe:</strong> ${field.size || '-'} ha</div>
              <div><strong>Kultur:</strong> ${getCropName(field.crop)}</div>
              <div><strong>Pflanzdatum:</strong> ${field.plantingDate || '-'}</div>
              <div><strong>Notizen:</strong> ${field.notes || '-'}</div>
            </div>
            <button class="delete-btn" data-id="${field.id}"><i class="fas fa-trash"></i></button>
          `;
          card.querySelector('.delete-btn').addEventListener('click', function() {
            deleteField(field.id);
          });
          fieldsContainer.appendChild(card);
        });
      }
    }

    // Bereich "Felder" (Tab)
    if (fieldsTableBody) {
      fieldsTableBody.innerHTML = '';
      if (!fields || fields.length === 0) {
        fieldsTableBody.innerHTML = '<tr><td colspan="5">Keine Felder vorhanden.</td></tr>';
      } else {
        fields.forEach(field => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${field.name || '-'}</td>
            <td>${field.size || '-'}</td>
            <td>${getCropName(field.crop)}</td>
            <td><span class="metric-status good">${field.status || '-'}</span></td>
            <td>
              <div class="field-actions">
                <button class="action-btn view-btn"><i class="fas fa-eye"></i></button>
                <button class="action-btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete-btn-table" data-id="${field.id}"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          `;
          // Delete-Button Event
          row.querySelector('.delete-btn-table').addEventListener('click', function() {
            deleteField(field.id);
          });
          fieldsTableBody.appendChild(row);
        });
      }
    }
  } catch (error) {
    if (fieldsContainer) fieldsContainer.innerHTML = `<div class="no-data">Fehler beim Laden der Felder.</div>`;
    if (fieldsTableBody) fieldsTableBody.innerHTML = '<tr><td colspan="5">Fehler beim Laden der Felder.</td></tr>';
  }
}

function deleteField(id) {
  let fields = JSON.parse(localStorage.getItem('agriFields')) || [];
  fields = fields.filter(f => f.id !== id);
  localStorage.setItem('agriFields', JSON.stringify(fields));
  loadFields();
  showNotification('Feld gelöscht!', 'success');
}

function loadMachinery() {}
function loadPersonnel() {}
function saveFarmDetails(e) { e.preventDefault(); showNotification('Betriebsdaten gespeichert!', 'success'); }
function addField(e) { e.preventDefault(); showNotification('Feld hinzugefügt!', 'success'); }
function addMachinery(e) { e.preventDefault(); showNotification('Maschine hinzugefügt!', 'success'); }
function addPersonnel(e) { e.preventDefault(); showNotification('Mitarbeiter hinzugefügt!', 'success'); }
function getCropName(crop) { switch (crop) { case 'wheat': return 'Weizen'; case 'corn': return 'Mais'; case 'rape': return 'Raps'; case 'barley': return 'Gerste'; case 'oats': return 'Hafer'; case 'potatoes': return 'Kartoffeln'; default: return crop; } }
