// AgriSmart: Neue, minimalistische Karten- und Felderintegration

// DOM-Elemente
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
const fieldsTableBody = document.getElementById('fields-table-body');

let map, drawnItems, polygonDrawer, currentPolygon = null, currentArea = 0;

function initFieldMap() {
  const mapContainer = document.getElementById('field-map-container');
  if (!mapContainer) return;
  if (map) { map.remove(); map = null; }
  map = L.map('field-map-container').setView([51.1657, 10.4515], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  const drawControl = new L.Control.Draw({
    position: 'topright',
    draw: false,
    edit: { featureGroup: drawnItems }
  });
  map.addControl(drawControl);
  map.on(L.Draw.Event.CREATED, (e) => {
    drawnItems.clearLayers();
    const layer = e.layer;
    currentPolygon = layer;
    currentArea = (L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 10000);
    modalFieldSize.value = currentArea.toFixed(2);
    fieldModal.style.display = 'block';
    drawnItems.addLayer(layer);
  });
  if (drawPolygonBtn) {
    drawPolygonBtn.onclick = () => {
      if (polygonDrawer) polygonDrawer.disable();
      polygonDrawer = new L.Draw.Polygon(map, {
        shapeOptions: { color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.3 }
      });
      polygonDrawer.enable();
    };
  }
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
  if (document.getElementById('field-map-container')) initFieldMap();
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => { fieldModal.style.display = 'none'; });
  });
  if (confirmFieldBtn) {
    confirmFieldBtn.addEventListener('click', saveFieldFromModal);
  }
});

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
          color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.3
        });
        polygon.bindPopup(`
          <b>${field.name}</b><br>
          Größe: ${field.size} ha<br>
          Kultur: ${field.crop}<br>
          ${field.notes ? `Notizen: ${field.notes}` : ''}
        `);
        polygon.addTo(map);
        drawnItems.addLayer(polygon);
      }
    });
    updateFieldsTable(fields);
  } catch (error) {
    alert('Fehler beim Laden der Felder: ' + (error.message || error));
  }
}

async function saveFieldFromModal() {
  if (!modalFieldName.value) return alert('Bitte geben Sie einen Feldnamen ein!');
  if (!modalPlantingDate.value) return alert('Bitte ein Pflanzdatum auswählen!');
  if (!currentPolygon) return alert('Bitte zeichne ein Feld auf der Karte!');
  confirmFieldBtn.disabled = true;
  const plantingDateISO = new Date(modalPlantingDate.value).toISOString().slice(0, 10);
  const fieldData = {
    name: modalFieldName.value,
    crop: modalFieldCrop.value,
    notes: modalFieldNotes.value,
    size: currentArea ? currentArea.toFixed(2) : '',
    coordinates: currentPolygon.getLatLngs()[0].map(ll => [ll.lat, ll.lng]),
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
    fieldModal.style.display = 'none';
    modalFieldName.value = '';
    modalFieldNotes.value = '';
    modalPlantingDate.value = '';
    currentPolygon = null;
    await loadFieldsOnMap();
  } catch (error) {
    let msg = 'Fehler beim Speichern des Feldes!';
    if (error && error.message) msg += '\n' + error.message;
    alert(msg);
  } finally {
    confirmFieldBtn.disabled = false;
  }
}

function updateFieldsTable(fields) {
  if (!fieldsTableBody) return;
  fieldsTableBody.innerHTML = '';
  if (!fields.length) {
    fieldsTableBody.innerHTML = '<tr><td colspan="5">Keine Felder vorhanden.</td></tr>';
    return;
  }
  fields.forEach(field => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${field.name || '-'}</td>
      <td>${field.size || '-'}</td>
      <td>${field.crop || '-'}</td>
      <td>${analyseFieldStatus(field)}</td>
      <td><button class="map-tool-btn" onclick="window.zoomToField && window.zoomToField(${JSON.stringify(field.coordinates)})"><i class="fas fa-eye"></i></button></td>
    `;
    fieldsTableBody.appendChild(row);
  });
}

function analyseFieldStatus(field) {
  // Beispiel: Status "Wachstum" oder "Erntebereit" je nach Datum
  if (!field.plantingDate) return '-';
  const start = new Date(field.plantingDate);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Geplant';
  if (diff < 90) return `Wachstum (${90 - diff} Tage bis Ernte)`;
  return 'Erntebereit';
}

window.zoomToField = function(coords) {
  if (!map || !coords || !Array.isArray(coords) || !coords.length) return;
  map.fitBounds(coords);
};
