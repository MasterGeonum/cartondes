
let map = L.map('map', {
  maxZoom: 18,
}).setView([45.75741, 4.83365], 12);

// Lyon : 45.75741,4.83365
// Grenoble : 45.18168,5.72029
// Valence : 44.93289,4.89212

let style = {
  "limite lyon": function my_style(feature) {
    return {
      color: '#606060',
      weight: 3,
    }
  },
  "sites_antennes": L.icon({
    iconUrl: '/staticFiles/img/pin.png',
    iconSize: [50, 50],
    popupAnchor: [0, -15]
  }),
}

let nouveauStyle = {
  color: '#ff6384', // couleur de la bordure
  fillColor: '#ff6384', // couleur de remplissage
  fillOpacity: 0.05,
};

let popup = {
  "sites_antennes": function (feature, layer) {
    layer.bindPopup(String(feature.properties.nb_antenne));
  },
}
map.createPane('labels');
map.getPane('labels').style.zIndex = 400;

let ortho = L.layerGroup();
let url_antenne = "geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3AAntennes&outputFormat=application%2Fjson"

let osm = L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
  }
).addTo(map);

let ign_ortho = L.tileLayer.wms('https://wxs.ign.fr/ortho/geoportail/r/wms?SERVICE=WMS', {
  layers: 'ORTHOIMAGERY.ORTHOPHOTOS',
  attribution: 'BD ORTHO IGN',
}).addTo(ortho);

let label = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain_labels/{z}/{x}/{y}{r}.{ext}', {
  minZoom: 0,
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ext: 'png'
}).addTo(ortho);

async function loadGeojson(url, layerGroup, style, popup) {
  let response = await fetch(url);
  let geojson = await response.json();

  let geojsonLayer = L.geoJSON(geojson, {
    pointToLayer: function (feature, latlng) {
      // Calculer l'échelle en fonction de la propriété nb_antenne
      let scale = feature.properties.nb_antenne / 35;

      // Définir une taille minimale pour les icônes
      let minSize = 20; // Taille minimale en pixels

      // Multiplier l'échelle par un facteur pour rendre les icônes plus grandes
      scale *= 2; // Vous pouvez ajuster ce facteur selon vos besoins

      // Vérifier si la taille calculée est inférieure à la taille minimale
      if (scale * 35 < minSize) {
        scale = minSize / 35; // Ajuster l'échelle pour atteindre la taille minimale
      }

      // Créer l'icône avec la taille et l'ancre ajustées
      let customIcon3 = L.icon({
        iconUrl: '/staticFiles/img/pin2.png', // Assurez-vous de spécifier le chemin de l'icône approprié
        iconSize: [35 * scale, 41 * scale], // Taille de l'icône proportionnelle à nb_antenne
        iconAnchor: [17 * scale, 42 * scale] // Garder les mêmes proportions entre iconSize et iconAnchor
      });

      let marker = L.marker(latlng, { icon: customIcon3 });

      // Calculer le popupAnchor en fonction de l'échelle
      let popupAnchorX = 15 * scale;
      let popupAnchorY = -25 * scale;

      // Créer un tooltip pour afficher le nombre d'antennes
      marker.bindTooltip("Nombre d'antennes: " + feature.properties.nb_antenne, {
        offset: [popupAnchorX, popupAnchorY] // Appliquer le popupAnchor calculé
      });

      return marker;
    },
    style: style,
    onEachFeature: popup
  });
  geojsonLayer.addTo(layerGroup);
}

let batiment = L.layerGroup();
let sites_antennes = L.layerGroup();
let lyon = L.layerGroup().addTo(map);

loadGeojson("geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Asites_antennes&outputFormat=application%2Fjson", sites_antennes, style["sites_antennes"], popup["sites_antennes"])
loadGeojson("geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Alimites_lyon&outputFormat=application%2Fjson", lyon, style["limite lyon"])

let wmsbati = L.tileLayer.wms('/geoserver/cartondes/wms?service=WMS', {
  layers: 'cartondes:batiments',
  format: 'image/png',
  transparent: true,
  minZoom: 14
}).addTo(batiment);

L.control.scale().addTo(map);

let baseMaps = {
  "Stadia maps": osm,
  "IGN Ortho": ortho,
};

let overlayMaps = {
  "Sites radio": sites_antennes,
  "Batiments": batiment,
};

// Contrôle des couches
let layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
let sidebar = L.control.sidebar('sidebar').addTo(map);

let customIcon = L.icon({
  iconUrl: '/staticFiles/img/pin.png',
  iconSize: [48, 48],
  iconAnchor: [22, 45],
});

let customIcon2 = L.icon({
  iconUrl: '/staticFiles/img/pin2.png',
  iconSize: [35, 41],
  iconAnchor: [17, 42]
});


let customIcon3 = L.icon({
  iconUrl: '/staticFiles/img/pin2_gris.png',
  iconSize: [38, 38], // Taille de l'icône
  iconSize: [35, 41],
  iconAnchor: [17, 42]
});

const slider = document.getElementById("filter-range");
let radius = 150;
let circle = null; // letiable pour stocker le cercle
let marker = null;
let isMarkerButtonActive = false; // letiable pour suivre l'état du bouton
let previousPointsLayer;
let previousPointsOutsideLayer;
let newPointsOutsideLayer
let previousLinesLayer; // letiable pour stocker la couche de lignes précédente
// Fonction pour filtrer et afficher les points dans le cercle
function filterAndDisplayPoints(circleCenter, circleRadius) {
  if (map.hasLayer(sites_antennes)) {
    map.removeLayer(sites_antennes);
  }
  // Supprimer les points précédemment affichés de la carte
  if (previousPointsLayer) {
    map.removeLayer(previousPointsLayer);
  }
  if (previousLinesLayer) {
    map.removeLayer(previousLinesLayer);
  }
  if (previousPointsOutsideLayer) {
    map.removeLayer(previousPointsOutsideLayer);
  }

  // Récupérer les points de la couche sites_antennes
  let sites_antennesFeatures = sites_antennes.toGeoJSON();

  // Filtrer les nouveaux points des sites d'antennes qui se trouvent dans le cercle
  let newPointsInCircle = sites_antennesFeatures.features.filter(function (feature) {
    let point = turf.point(feature.geometry.coordinates);
    let distance = turf.distance(circleCenter, point);
    return distance <= circleRadius / 1000;
  });

  document.getElementById("total_site").textContent = newPointsInCircle.length;
  document.getElementById("rayon").textContent = circleRadius;

  let newPointsOutsideCircle = sites_antennesFeatures.features.filter(function (feature) {
    let point = turf.point(feature.geometry.coordinates);
    let distance = turf.distance(circleCenter, point);
    return distance > circleRadius / 1000;
  });

  // Créer un linestring pour chaque point dans le cercle
  let lineStrings = [];
  newPointsInCircle.forEach(function (pointFeature) {
    let point = turf.point(pointFeature.geometry.coordinates);
    let line = turf.lineString([circleCenter.geometry.coordinates, point.geometry.coordinates]);
    let length = turf.length(line); // Calculer la longueur du linestring
    line.properties = { length: length }; // Ajouter la longueur comme attribut
    lineStrings.push(line);

    let distanceToCenter = turf.distance(circleCenter, point);
    pointFeature.properties.distance_centre = parseInt(distanceToCenter * 1000);
  });

  let labels = [];
  let data = [];

  newPointsInCircle.sort(function (a, b) {
    return a.properties.distance_centre - b.properties.distance_centre;
  });

  if (newPointsInCircle.length > 0) {
    let premiereDistanceCentre = newPointsInCircle[0].properties.distance_centre;
    document.getElementById("proximite").textContent = premiereDistanceCentre;
    document.getElementById("nb_antenne_proche").textContent = newPointsInCircle[0].properties.nb_antenne;

  } else {
    document.getElementById("proximite").textContent = 0
    document.getElementById("nb_antenne_proche").textContent = 0;

  }

  let sommeNbAntenne = 0;
  newPointsInCircle.forEach(function (pointFeature) {
    sommeNbAntenne += pointFeature.properties.nb_antenne;
  });
  document.getElementById("total_antenne").textContent = sommeNbAntenne

  newPointsInCircle.forEach(function (pointFeature) {
    let properties = pointFeature.properties;
    data.push({ id: properties.id_site, nb_antenne: properties.nb_antenne });
  });

  // Trier les données par ordre décroissant de nb_antenne
  data.sort((a, b) => b.distance_centre - a.distance_centre);

  // Mettre à jour les données du graphique
  myChart.data.labels = data.map(point => point.id);
  myChart.data.datasets[0].data = data.map(point => point.nb_antenne);
  myChart.update();

  // Convertir les linestrings en GeoJSON
  let lineStringsGeoJSON = turf.featureCollection(lineStrings);

  // Ajouter les linestrings à la carte
  previousLinesLayer = L.geoJSON(lineStringsGeoJSON, {
    style: {
      color: '#7479ee', // couleur de la ligne
      weight: 2.5, // épaisseur de la ligne
      opacity: 1,
      dashArray: "10 5"
    } // opacité de la ligne
  }).addTo(map);

  // Ajouter les nouveaux points à la carte
  let newPointsLayer = L.geoJSON(newPointsInCircle, {
    pointToLayer: function (feature, latlng) {
      // Calculer l'échelle en fonction de la propriété nb_antenne
      let scale = feature.properties.nb_antenne / 35;

      // Définir une taille minimale pour les icônes
      let minSize = 20; // Taille minimale en pixels

      // Multiplier l'échelle par un facteur pour rendre les icônes plus grandes
      scale *= 2; // Vous pouvez ajuster ce facteur selon vos besoins

      // Vérifier si la taille calculée est inférieure à la taille minimale
      if (scale * 35 < minSize) {
        scale = minSize / 35; // Ajuster l'échelle pour atteindre la taille minimale
      }

      // Créer l'icône avec la taille et l'ancre ajustées
      let customIcon3 = L.icon({
        iconUrl: '/staticFiles/img/pin2.png', // Assurez-vous de spécifier le chemin de l'icône approprié
        iconSize: [35 * scale, 41 * scale], // Taille de l'icône proportionnelle à nb_antenne
        iconAnchor: [17 * scale, 42 * scale] // Garder les mêmes proportions entre iconSize et iconAnchor
      });

      let marker = L.marker(latlng, { icon: customIcon3 });

      // Calculer le popupAnchor en fonction de l'échelle
      let popupAnchorX = 15 * scale;
      let popupAnchorY = -25 * scale;

      // Créer un tooltip pour afficher le nombre d'antennes
      marker.bindTooltip("Nombre d'antennes: " + feature.properties.nb_antenne, {
        offset: [popupAnchorX, popupAnchorY] // Appliquer le popupAnchor calculé
      });

      return marker;
    }
  }).addTo(map);

  let list_data = []
  newPointsLayer.eachLayer(function (layer) {
    // Obtenez les propriétés de la feature actuelle
    let properties = layer.feature.properties;
    list_data.push(properties);
  });

  // Mettre à jour la référence des points précédents
  previousPointsInCircle = newPointsInCircle;
  previousPointsLayer = newPointsLayer;

  let newPointsOutsideLayer = L.geoJSON(newPointsOutsideCircle, {
    pointToLayer: function (feature, latlng) {
      // Calculer l'échelle en fonction de la propriété nb_antenne
      let scale = feature.properties.nb_antenne / 35;

      // Définir une taille minimale pour les icônes
      let minSize = 20; // Taille minimale en pixels

      // Multiplier l'échelle par un facteur pour rendre les icônes plus grandes
      scale *= 2; // Vous pouvez ajuster ce facteur selon vos besoins

      // Vérifier si la taille calculée est inférieure à la taille minimale
      if (scale * 35 < minSize) {
        scale = minSize / 35; // Ajuster l'échelle pour atteindre la taille minimale
      }

      // Créer l'icône avec la taille et l'ancre ajustées
      let customIcon3 = L.icon({
        iconUrl: '/staticFiles/img/pin2_gris.png', // Assurez-vous de spécifier le chemin de l'icône approprié
        iconSize: [35 * scale, 41 * scale], // Taille de l'icône proportionnelle à nb_antenne
        iconAnchor: [17 * scale, 42 * scale] // Garder les mêmes proportions entre iconSize et iconAnchor
      });

      let marker = L.marker(latlng, { icon: customIcon3 });

      // Calculer le popupAnchor en fonction de l'échelle
      let popupAnchorX = 15 * scale;
      let popupAnchorY = -25 * scale;

      // Créer un tooltip pour afficher le nombre d'antennes
      marker.bindTooltip("Nombre d'antennes: " + feature.properties.nb_antenne, {
        offset: [popupAnchorX, popupAnchorY] // Appliquer le popupAnchor calculé
      });

      return marker;
    }
  }).addTo(map);

  previousPointsOutsideCircle = newPointsOutsideCircle;
  previousPointsOutsideLayer = newPointsOutsideLayer;

}

// Écouteur d'événement pour l'input range
slider.addEventListener("input", function () {
  radius = this.value;
  if (circle) {
    circle.setRadius(radius); // Mettre à jour le rayon du cercle

    // Récupérer les coordonnées du centre du cercle
    let circleLatLng = circle.getLatLng();
    let circleRadius = circle.getRadius();

    // Créer un point Turf.js à partir des coordonnées du centre du cercle
    let circleCenter = turf.point([circleLatLng.lng, circleLatLng.lat]);

    // Filtrer et afficher les points dans le cercle
    filterAndDisplayPoints(circleCenter, circleRadius);
  }
});

// Fonction pour placer le marqueur et le cercle
function toggleMarker(event) {
  if (isMarkerButtonActive) {
    if (marker) {
      map.removeLayer(marker);
      marker = null;
      if (circle) {
        map.removeLayer(circle);
        circle = null;
      }
    } else {
      marker = L.marker(event.latlng, { icon: customIcon, riseOnHover: true }).addTo(map); // Utilisation de l'icône personnalisée
      circle = L.circle(event.latlng, { radius: radius }).addTo(map);
      circle.setStyle(nouveauStyle);
      // Récupérer les coordonnées du centre du cercle
      let circleLatLng = circle.getLatLng();
      let circleRadius = circle.getRadius();

      // Créer un point Turf.js à partir des coordonnées du centre du cercle
      let circleCenter = turf.point([circleLatLng.lng, circleLatLng.lat]);

      // Filtrer et afficher les points dans le cercle
      filterAndDisplayPoints(circleCenter, circleRadius);
    }
  }
}

map.on('click', function (event) {
  if (!marker && isMarkerButtonActive) {
    // Vérifie si le bouton est activé avant de placer un marqueur
    toggleMarker(event);
  }
});

map.on('click', function () {
  // Réinitialiser le curseur à sa valeur par défaut
  let mapElement = document.getElementById('map');
  mapElement.style.cursor = 'grab';
});

let pointCounter = 0;
let pointsData = [];

// Gestionnaire d'événement pour le clic sur le bouton
document.getElementById('addMarkerBtn').addEventListener('click', function () {
  isMarkerButtonActive = !isMarkerButtonActive; // Inverse l'état du bouton
  let mapElement = document.getElementById('map');

  // Changer le curseur en viseur uniquement pour l'élément de la carte Leaflet
  mapElement.style.cursor = isMarkerButtonActive ? 'crosshair' : 'crosshair';
  if (!isMarkerButtonActive && marker) {
    map.removeLayer(marker);
    marker = null;
    isMarkerButtonActive = true;
    if (circle) {
      map.removeLayer(circle); // Supprimer le cercle lorsque le marqueur est supprimé
      circle = null;
    }
  }
});

document.getElementById('recherche').addEventListener('click', function () {
  let address = document.getElementById('geocode').value;
  let url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&limit=1';

  fetch(url)
    .then(response => response.json())
    .then(data => {
      let lon = data[0].lon
      let lat = data[0].lat
      if (marker) {
        map.removeLayer(marker);
        marker = null;
        if (circle) {
          map.removeLayer(circle);
          circle = null;
        }
      }
      marker = L.marker([lat, lon], { icon: customIcon }).addTo(map); // Utilisation de l'icône personnalisée
      circle = L.circle([lat, lon], { radius: radius }).addTo(map);
      circle.setStyle(nouveauStyle);

      // Récupérer les coordonnées du centre du cercle
      let circleLatLng = circle.getLatLng();
      let circleRadius = circle.getRadius();

      // Créer un point Turf.js à partir des coordonnées du centre du cercle
      let circleCenter = turf.point([circleLatLng.lng, circleLatLng.lat]);

      // Filtrer et afficher les points dans le cercle
      filterAndDisplayPoints(circleCenter, circleRadius);

      map.setView([lat, lon], 16);
    });
}
);

// Définissez la valeur par défaut du slider
const defaultValue = radius;

// Vérifiez s'il existe une valeur enregistrée dans le stockage local
const savedValue = localStorage.getItem("sliderValue");

// Si une valeur est enregistrée, utilisez-la ; sinon, utilisez la valeur par défaut
slider.value = savedValue !== null ? savedValue : defaultValue;

// Ajoutez un écouteur d'événements pour enregistrer la valeur du slider lorsque celle-ci change
slider.addEventListener("input", function () {
  localStorage.setItem("sliderValue", slider.value);
});

// Ajoutez un écouteur d'événements pour réinitialiser la valeur du slider à sa valeur par défaut lors du rechargement de la page
window.addEventListener("load", function () {
  if (savedValue !== null) {
    localStorage.removeItem("sliderValue");
    slider.value = defaultValue;
  }
});

let data = {
  labels: [],
  datasets: [{
    label: "Nombre d'antennes par site",
    backgroundColor: '#7479ee',
    borderColor: '#7479ee',
    data: [],
  }]
};

// Configuration du graphique
let options = {
  responsive: true,
  maintainAspectRatio: false,
};

// Création du graphique
let ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
  type: 'bar', // Changement du type de graphique en barre
  data: data,
  options: options
});

let rangeSlider = function () {
  let slider = $('.range-slider'),
    range = $('.range-slider__range'),
    value = $('.range-slider__value');

  slider.each(function () {

    value.each(function () {
      let value = $(this).prev().attr('value');
      $(this).html(value + "m");
    });

    range.on('input', function () {
      $(this).next(value).html(this.value + "m");
    });
  });
};

rangeSlider();
// Gestionnaire d'événements pour supprimer les couches
document.getElementById('removeLayersBtn').addEventListener('click', function () {
  // Supprimer les couches de la carte
  if (previousPointsLayer) {
    map.removeLayer(previousPointsLayer);
  }
  if (previousLinesLayer) {
    map.removeLayer(previousLinesLayer);
  }
  if (previousPointsOutsideLayer) {
    map.removeLayer(previousPointsOutsideLayer);
  }

  // Supprimer le cercle et le marqueur
  if (circle) {
    map.removeLayer(circle);
    circle = null;
  }
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }

  // Réinitialiser les données du graphique
  myChart.data.labels = [];
  myChart.data.datasets[0].data = [];
  myChart.update();

  document.getElementById("proximite").textContent = 0;
  document.getElementById("nb_antenne_proche").textContent = 0;
  document.getElementById("total_site").textContent = 0;
  document.getElementById("rayon").textContent = 0;
  document.getElementById("total_antenne").textContent = 0;

  // Mettre à jour l'état du bouton pour ajouter un marqueur
  isMarkerButtonActive = false;
});

function mettreAJourCouchesActivées() {
  // Initialisez une liste vide pour stocker les couches activées
  let couchesActivées2 = [];
  // Parcourez toutes les couches ajoutées au gestionnaire de couches
  layerControl._layers.forEach(function (couche) {
    // Vérifiez si la couche est activée
    if (map.hasLayer(couche.layer)) {
      // Ajoutez la couche activée à la liste
      couchesActivées2.push(couche.name);
    }
  });
  var couchesActivées = couchesActivées2.filter(function (e) { return e !== 'Stadia maps' })  // Si aucune couche n'est cochée, masquez la div legende-container
  if (couchesActivées.length === 0) {
    document.getElementById("legende-container").style.display = "none";
  } else {
    // Sinon, assurez-vous qu'elle est affichée
    document.getElementById("legende-container").style.display = "block";
  }

  // Si la couche "Batiments" est activée, masquez la div correspondante
  if (couchesActivées.includes("Batiments")) {
    document.getElementById("Batiments").style.display = "flex";
  } else {
    // Sinon, assurez-vous qu'elle est affichée
    document.getElementById("Batiments").style.display = "none";
  }

  if (couchesActivées.includes("Sites radio")) {
    document.getElementById("sites_antennes").style.display = "block";
  } else {
    // Sinon, assurez-vous qu'elle est affichée
    document.getElementById("sites_antennes").style.display = "none";
  }

}

mettreAJourCouchesActivées();
map.on('overlayadd', mettreAJourCouchesActivées);
map.on('overlayremove', mettreAJourCouchesActivées);
