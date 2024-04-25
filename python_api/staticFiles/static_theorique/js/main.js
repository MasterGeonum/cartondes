let map = L.map('map', {
  maxZoom: 18,
}).setView([45.75741, 4.83365], 12);

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
  "batiment": function (feature) {
    return {
      fillColor: 'rgb(107, 186, 163)',
      color: '#6bbaa3',
      weight: 2,
      fillOpacity: .3
    };
  },
  "ligne_antenne":
    function (feature) {
      return {
        color: '#7479ee',
        weight: 2.5,
        opacity: 1,
        dashArray: "10 5"
      }
    },
  "ligne":
    function (feature) {
      return {
        color: '#7479ee', // couleur de la ligne
        weight: 2.5, // épaisseur de la ligne
        opacity: 1,
        dashArray: "10 5"
      }
    }
}

let nouveauStyle = {
  color: '#ff6384', // couleur de la bordure
  fillColor: '#ff6384', // couleur de remplissage
  fillOpacity: 0.05,
};

map.createPane('labels');
map.getPane('labels').style.zIndex = 400;

let ortho = L.layerGroup();
let osm = L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  {
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
  }
).addTo(map);

let ign_ortho = L.tileLayer.wms('https://wxs.ign.fr/ortho/geoportail/r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&crs=EPSG%3A3857', {
  layers: 'ORTHOIMAGERY.ORTHOPHOTOS',
  attribution: 'BD ORTHO IGN',
}).addTo(ortho);


function createCustomMarker(feature, icon, latlng) {
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
  let customIcon = L.icon({
    iconUrl: icon, // Assurez-vous de spécifier le chemin de l'icône approprié
    iconSize: [35 * scale, 41 * scale], // Taille de l'icône proportionnelle à nb_antenne
    iconAnchor: [17 * scale, 42 * scale] // Garder les mêmes proportions entre iconSize et iconAnchor
  });

  // Calculer le popupAnchor en fonction de l'échelle
  let popupAnchorX = 15 * scale;
  let popupAnchorY = -25 * scale;

  // Créer le marqueur
  let marker = L.marker(latlng, { icon: customIcon });
  // Ajouter un gestionnaire d'événements pour le clic sur le marqueur
  marker.addEventListener('click', function () {
    // Appeler la fonction pour afficher les propriétés du marqueur
    logFeatureProperties(feature);
  });
  // Créer un tooltip pour afficher le nombre d'antennes
  marker.bindTooltip(feature.properties.nb_antenne + " antennes", {
    offset: [popupAnchorX, popupAnchorY] // Appliquer le popupAnchor calculé
  });
  // Retourner le marqueur personnalisé
  return marker;
}

async function loadGeojson(url, layerGroup, style) {
  let response = await fetch(url);
  let geojson = await response.json();

  let geojsonLayer = L.geoJSON(geojson, {
    pointToLayer: function (feature, latlng) {
      return createCustomMarker(feature, '/staticFiles/img/pin2.png', latlng);
    },
    style: style,
  });
  geojsonLayer.addTo(layerGroup);
}

let geojsonLayer = null;
let apiMarker = null;
let sitesAntennesLayer;
let previousCircle = null;
var lastClickedFeature;

function logFeatureProperties(feature, distance) {
  lastClickedFeature = feature
  let id_site = feature.properties.id_site;
  var distance = document.getElementById("filter-range2").value;
  let sites_antennesFeatures = sites_antennes.toGeoJSON();
  // Supprimer la couche GeoJSON précédente s'il y en a une
  const layersToRemove = [sitesAntennesLayer, previousCircle, marker, previousLinesLayer, apiMarker, circle];

  layersToRemove.forEach(layer => {
    if (layer) {
      map.removeLayer(layer);
    }
  });

  sitesAntennesLayer = L.geoJSON(sites_antennesFeatures, {
    pointToLayer: function (feature, latlng) {
      return createCustomMarker(feature, '/staticFiles/img/pin2_gris.png', latlng);
    }
  }).addTo(map);
  apiMarker = L.geoJSON(feature, {
    pointToLayer: function (feature, latlng) {
      return createCustomMarker(feature, '/staticFiles/img/pin2.png', latlng);
    }
  }).addTo(map);

  var coordonnees = apiMarker.getBounds().getCenter();
  var cercle = L.circle(coordonnees, {
    color: '#7479ee', // Couleur du cercle
    fillColor: '#7479ee', // Couleur de remplissage
    fillOpacity: 0.05, // Opacité du remplissage
    radius: distance // Rayon du cercle en mètres
  }).addTo(map);
  previousCircle = cercle;

  document.getElementById("id_site").textContent = feature.properties.id_site;
  var tableTab = document.querySelector('a[href="#habitation"]');
  if (!tableTab.parentElement.classList.contains('active')) {
    tableTab.click();
  }

  let url = `http://127.0.0.1:1234/batiment/${id_site}/${distance}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      let somme_inf_10 = 0;
      let somme_sup_10_inf_65 = 0;
      let somme_sup_65 = 0;

      // Parcours de chaque objet dans le JSON
      data.features.forEach(feature => {
        let properties = feature.properties;
        // Ajout des valeurs à chaque somme
        somme_inf_10 += properties.population_inf_10;
        somme_sup_10_inf_65 += properties.population_sup_10_inf_65;
        somme_sup_65 += properties.population_sup_65;
      });

      myChart2.data.datasets[0].data = [somme_inf_10, somme_sup_10_inf_65, somme_sup_65];
      myChart2.update();

      // Supprimer la couche GeoJSON précédente s'il y en a une
      if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
      }

      // Charger les données GeoJSON dans la carte Leaflet
      geojsonLayer = L.geoJSON(data, {
        style: function (feature) {
          var population = feature.properties.population_batiment;
          var color;
          if (population >= 0 && population <= 18) {
            color = '#feebe2';
          } else if (population > 18 && population <= 61) {
            color = '#fbb4b9';
          } else if (population > 61 && population <= 161) {
            color = '#f768a1';
          } else if (population > 161 && population <= 575) {
            color = '#c51b8a';
          } else if (population > 575 && population <= 1059) {
            color = '#7a0177';
          } else {
            // Si la population dépasse 1059, vous pouvez définir une autre couleur
            color = '#000000'; // par exemple noir
          }
          return {
            fillColor: color,
            weight: .5,
            opacity: .8,
            color: '#808080',
            fillOpacity: 1
          };
        },
        onEachFeature: function (feature, layer) {
          layer.on({
            mouseover: function (e) {
              layer.setStyle({
                color: '#7479ee',
                weight: 4
              });
            },
            mouseout: function (e) {
              layer.setStyle({
                color: '#808080',
                weight: .5
              });
            }
          });
        }
      }).addTo(map);
      geojsonLayer.eachLayer(function (layer) {
        var properties = layer.feature.properties;
        var popupContent = "<b>Usage </b> " + properties.usage_batiment + "<br>" +
          "<b>Population </b> " + properties.population_batiment + "<br>" +
          "<b>Hauteur </b> " + properties.hauteur_batiment + " mètres<br>" +
          "<b>Surface </b> " + properties.surface_batiment + "m²";
        layer.bindPopup(popupContent);
      });
    });
}

var slider3 = document.getElementById("filter-range2");

// Ajoutez un gestionnaire d'événements sur le changement de valeur du slider
slider3.addEventListener('input', function () {
  // Vérifiez d'abord si lastClickedFeature est définie
  if (lastClickedFeature) {
    // Si oui, appelez la fonction logFeatureProperties avec la valeur actuelle du slider
    logFeatureProperties(lastClickedFeature, this.value);
  }
});

let myChart2; // Déclarer la variable myChart2 globalement

document.addEventListener('DOMContentLoaded', function () {
  var ctx = document.getElementById('myChart2').getContext('2d');
  myChart2 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['-10 ans', '+10 ans et -65 ans', '+65 ans'],
      datasets: [{
        data: [],
        backgroundColor: [
          '#fbb4b9',
        ],
        borderColor: [
          '#808080',
        ],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          display: false
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
      },
    }
  });
});



let batiment = L.layerGroup();
let sites_antennes = L.layerGroup();
let lyon = L.layerGroup().addTo(map);

let wmsbati = L.tileLayer.wms('http://localhost:8080/geoserver/cartondes/wms?service=WMS', {
  layers: 'cartondes:batiment',
  format: 'image/png',
  transparent: true,
  minZoom: 14
}).addTo(batiment);

loadGeojson("http://localhost:8080/geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Asites_antennes&outputFormat=application%2Fjson", sites_antennes, style["sites_antennes"])
loadGeojson("http://localhost:8080/geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3ALimites_lyon&maxFeatures=50&outputFormat=application%2Fjson", lyon, style["limite lyon"])

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

let sites_antennesFeatures = sites_antennes.toGeoJSON();

const slider = document.getElementById("filter-range");
let radius = 150;
let circle = null; // letiable pour stocker le cercle
let marker = null;
let isMarkerButtonActive = false; // letiable pour suivre l'état du bouton
let previousPointsLayer;
let previousPointsOutsideLayer;
let newPointsOutsideLayer;
let previousPointsOutsideCircle;
let newPointsLayer;
let previousLinesLayer; // letiable pour stocker la couche de lignes précédente
// Fonction pour filtrer et afficher les points dans le cercle

function filterAndDisplayPoints(circleCenter, circleRadius) {

  [previousCircle, newPointsLayer, previousPointsLayer, sites_antennes, previousLinesLayer, previousPointsOutsideLayer, previousPointsOutsideCircle, geojsonLayer, apiMarker].forEach(layer => {
    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
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
    data.push({ id: properties.id_site, nb_antenne: properties.nb_antenne, distance_centre: properties.distance_centre });
  });

  // Trier les données par ordre décroissant de nb_antenne
  data.sort((a, b) => a.distance_centre - b.distance_centre);

  // Mettre à jour les données du graphique
  myChart.data.labels = data.map(point => point.id);
  myChart.data.datasets[0].data = data.map(point => point.nb_antenne);
  myChart.update();

  // Convertir les linestrings en GeoJSON
  let lineStringsGeoJSON = turf.featureCollection(lineStrings);

  // Ajouter les linestrings à la carte
  previousLinesLayer = L.geoJSON(lineStringsGeoJSON, {
    style: style["ligne"]
  }).addTo(map);

  // Ajouter les nouveaux points à la carte
  newPointsLayer = L.geoJSON(newPointsInCircle, {
    pointToLayer: function (feature, latlng) {
      return createCustomMarker(feature, '/staticFiles/img/pin2.png', latlng);
    },
  })

  // Mettre à jour la référence des points précédents
  previousPointsInCircle = newPointsInCircle;
  previousPointsLayer = newPointsLayer;
  previousPointsLayer.addTo(map)
  let newPointsOutsideLayer = L.geoJSON(newPointsOutsideCircle, {
    pointToLayer: function (feature, latlng) {
      return createCustomMarker(feature, '/staticFiles/img/pin2_gris.png', latlng);
    },
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
let isPopupEnabled = true;

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
    [circle, previousLinesLayer, previousPointsOutsideCircle, previousPointsOutsideLayer, previousCircle, geojsonLayer].forEach(layer => {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    })
    map.addLayer(previousPointsOutsideLayer)
  }
});



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
    label: "", // Définir une chaîne vide pour le label
    backgroundColor: ['#7479ee'],
    borderColor: [
      'black',
    ],
    hoverBackgroundColor: "#6cdeb7",
    data: [],
    borderWidth: 1
  }]
};

let previousMarker = null; // variable pour stocker le marqueur précédent

// Ajouter le marqueur à la carte avec l'icône personnalisée
function addMarker(location, data) {
  if (previousMarker) {
    map.removeLayer(previousMarker);
  }
  let scale = data.nb_antenne / 35;
  let minSize = 20; // Taille minimale en pixels
  scale *= 2; // Vous pouvez ajuster ce facteur selon vos besoins
  if (scale * 35 < minSize) {
    scale = minSize / 35; // Ajuster l'échelle pour atteindre la taille minimale
  }
  let selectIcon = L.icon({
    iconUrl: '/staticFiles/img/pin3.png', // Assurez-vous de spécifier le chemin de l'icône approprié
    iconSize: [35 * scale, 41 * scale], // Taille de l'icône proportionnelle à nb_antenne
    iconAnchor: [17 * scale, 42 * scale] // Garder les mêmes proportions entre iconSize et iconAnchor
  });
  previousMarker = L.marker(location, { customData: data, icon: selectIcon }).addTo(map);
}

let options = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      display: false,
      grid: {
        display: false,
      },
    },
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          markers = sites_antennes.toGeoJSON();
          let filteredMarkers = L.geoJSON(markers, {
            filter: function (feature, layer) {
              return feature.properties.id_site == context.label;
            }
          });
          // Récupérer la position du nouveau marqueur filtré
          let markerData = filteredMarkers.getLayers()[0].feature.properties; // Données du marqueur filtré

          // Ajouter le marqueur à la carte avec les données personnalisées
          addMarker(filteredMarkers.getLayers()[0].getLatLng(), markerData);

          // Retourner le texte du tooltip avec les données personnalisées
          return context.parsed.y + ' antennes';
        },
        // Retourner null pour cacher le titre de l'élément survolé
        title: function (tooltipItem) {
          return null;
        }
      }
    }
  },
};

let ctx = document.getElementById('myChart').getContext('2d');
let myChart = new Chart(ctx, {
  type: 'bar',
  data: data,
  options: options
});

ctx.canvas.addEventListener('mouseleave', function () {
  // Supprimer le marqueur précédent s'il existe
  if (previousMarker) {
    map.removeLayer(previousMarker);
  }
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

  [sitesAntennesLayer, marker, circle, previousPointsLayer, previousPointsInCircle, previousPointsOutsideLayer, previousCircle, sites_antennes, previousLinesLayer, previousPointsOutsideCircle, geojsonLayer, apiMarker].forEach(layer => {
    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });

  // Réinitialiser les variables à null
  circle = null;
  marker = null;

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

window.onload = function () {
  var slider = document.getElementById('filter-range2');
  slider.value = 150;
  var output = document.getElementById('range-slider__value2');
  output.innerHTML = slider.value + "m";

  // Mettre à jour la valeur affichée lors du changement du slider
  slider.oninput = function () {
    output.innerHTML = this.value + "m";
  }
};

$(document).ready(function () {
  // Ajoute la classe 'active' à l'onglet #home
  $('#home').addClass('active');
  // Supprime la classe 'collapsed' de la barre latérale
  $('.sidebar').removeClass('collapsed');


});

