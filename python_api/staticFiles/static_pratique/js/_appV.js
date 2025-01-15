var map = L.map('map', {
    maxZoom: 25,
    minZoom: 5
}).setView([45.75741, 4.83365], 12);


// Lyon : 45.75741,4.83365
// Grenoble : 45.18168,5.72029
// Valence : 44.93289,4.89212

var sidebar = L.control.sidebar('sidebar').addTo(map);

map.createPane('labels');
map.getPane('labels').style.zIndex = 200;

let ortho = L.layerGroup().addTo(map);

var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 25,
    minZoom: 5,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})

var stadiaLayer = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    {
        maxZoom: 25,
        minZoom: 5,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    }
).addTo(ortho);



// fonction pour obtenir l'icon pour les point de mesure
function getIcon(d) {
    switch (d) {
        case 1:
            return '/staticFiles/img/mes1.png';
        case 2:
            return '/staticFiles/img/mes2.png';
        case 3:
            return '/staticFiles/img/mes3.png';
        case 4:
            return '/staticFiles/img/mes4.png';
        case 5:
            return '/staticFiles/img/mes5.png';
        case 6:
            return '/staticFiles/img/mes6.png';
        case 7:
            return '/staticFiles/img/mes7.png';
        case 8:
            return '/staticFiles/img/mes8.png';
        case 9:
            return '/staticFiles/img/mes9.png';
        case 10:
            return '/staticFiles/img/mes10.png';
        case 11:
            return '/staticFiles/img/mes11.png';
        case 12:
            return '/staticFiles/img/mes12.png';
        case 13:
            return '/staticFiles/img/mes13.png';
        case 14:
            return '/staticFiles/img/mes14.png';
        case 15:
            return '/staticFiles/img/mes15.png';
        default:
            return 'https://cdn.jsdelivr.net/npm/leaflet@1.9.1/dist/images/marker-icon.png'; // Définissez une icône par défaut si nécessaire
    }
}

// fonction pour le style pour les carreaux de population
function iconMesure(feature) {
    return {
        iconUrl: getIcon(feature.properties.id_histoire),
        iconSize: [35, 35]
    };
}

async function load_file(url, layerGroup) {
    let response = await fetch(url);
    let layer = await response.json();

    let geojsonLayer;
    if (url === site) {
        geojsonLayer = L.geoJSON(layer, {
            pointToLayer: function (feature, latlng) {
                let scale = feature.properties.nb_antenne / 35;

                // Définir une taille minimale pour les icônes
                let minSize = 20; // Taille minimale en pixels

                // Multiplier l'échelle par un facteur pour rendre les icônes plus grandes
                scale *= 2; // Vous pouvez ajuster ce facteur selon vos besoins

                // Vérifier si la taille calculée est inférieure à la taille minimale
                if (scale * 35 < minSize) {
                    scale = minSize / 35; // Ajuster l'échelle pour atteindre la taille minimale
                }
                return L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: '/staticFiles/img/pin2.png',
                        iconSize: [35 * scale, 41 * scale],
                    })
                });
            },
            onEachFeature: function (feature, layer) {
                let popupContent = "<br>Nombre d'antennes: " + feature.properties.nb_antenne;
                layer.bindPopup(popupContent);
            }
        });
    } else {
        geojsonLayer = L.geoJSON(layer, {
            pointToLayer: function (feature, latlng) {
                return L.marker(latlng, { icon: L.icon(iconMesure(feature)) });
            },
            onEachFeature: function (feature, layer) {
                let popupContent = "Coordonnées: " + feature.geometry.coordinates.join(", ") +
                    "<br>Description: " + feature.properties.description;
                layer.bindPopup(popupContent);
            }
        });
    }

    geojsonLayer.addTo(layerGroup);

    if (url !== site) {
        map.fitBounds(geojsonLayer.getBounds());
    }

    return geojsonLayer;
}

let mesure = L.layerGroup();
let batiment_m = L.layerGroup();
let site_a = L.layerGroup();

let point_mesure = "geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Apoint_histoire&outputFormat=application%2Fjson"
let site = "geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Asites_antennes&outputFormat=application%2Fjson"

load_file(point_mesure, mesure);
load_file(site, site_a); // Ajoutez site_a comme une couche de site

let wmsbati = L.tileLayer.wms('/geoserver/cartondes/wms?service=WMS', {
    layers: 'cartondes:batiment',
    format: 'image/png',
    transparent: true,
    minZoom: 14
}).addTo(batiment_m);

var basemaps = {
    "OpenStreetMap": osm,
    stadiaLayer: stadiaLayer
};

var overlays_maps = {
    "Mesure": mesure.addTo(map),
    "Batiment": batiment_m, // Ajoutez batiment_m à la carte
    "Site": site_a, // Ajoutez site_a à la carte
};


var layerControl = L.control.layers(basemaps, overlays_maps).addTo(map);


L.control.scale().addTo(map);

async function fetchFeatures(url) {
    let response = await fetch(url);
    let data = await response.json();
    return data.features;
}

async function loadFeatures(url) {
    let features = await fetchFeatures(url);
    let uniqueDescriptions = [];
    let uniqueDates = [];
    let uniqueHistories = [];

    features.forEach(feature => {
        let description = feature.properties.description_point;
        let date = feature.properties.dateh_point;
        let history = feature.properties.nom_histoire;

        if (description && !uniqueDescriptions.includes(description)) {
            uniqueDescriptions.push(description);
        }
        if (date && !uniqueDates.includes(date)) {
            uniqueDates.push(date);
        }
        if (history && !uniqueHistories.includes(history)) {
            uniqueHistories.push(history);
        }
    });
    // createDropdown(uniqueDates, 'dateh_point', 'Date');
    createDropdown(uniqueHistories, 'nom_histoire', 'Nom d\'histoire');
}

function createDropdown(values, id, label) {
    if (!values || values.length === 0) {
        console.error(`No values provided for dropdown ${label}`);
        return;
    }

    let filterGroup = $('#profile');
    let filterDiv = $('<div class="filter-group"></div>');
    filterDiv.append(`<h3>${label}</h3>`);

    // Vérifier si le label est 'dateh_point' pour décider du type d'élément à créer
    if (id === 'dateh_point') {
        // Si c'est 'dateh_point', créer un select multiple
        let select = $(`<select id="${id}" multiple class="filter-select"></select>`);
        values.forEach(value => {
            if (value === null) {
                return;
            }
            select.append(`<option value="${value}">${value}</option>`);
        });
        filterDiv.append(select);
    } else if (id === 'nom_histoire') {
        // Si c'est 'nom_histoire', créer des boutons radio
        let radioGroup = $('<div class="radio-group"></div>'); // Créer le conteneur pour les boutons radio
        values.forEach(value => {
            if (value === null) {
                return;
            }
            let radioInput = $(`<div class="radio-input">
                                    <input type="radio" id="${value.replace(/\s+/g, '_').toLowerCase()}" name="${id}" value="${value}">
                                    <label for="${value.replace(/\s+/g, '_').toLowerCase()}">${value}</label>
                                </div>`);
            radioGroup.append(radioInput);
        });
        filterDiv.append(radioGroup);
    }

    filterGroup.append(filterDiv);
}



function handleDropdownChange() {
    const selectedDates = $('#dateh_point').val();
    const selectedHistories = $('input[name="nom_histoire"]:checked').map(function () {
        return this.value;
    }).get();
    const cqlFilter = createCqlFilter(selectedDates, selectedHistories);
}

$('#profile').on('change', 'input[type="radio"][name="nom_histoire"]', function () {
    handleFilterButtonClick(true);
});


function createCqlFilter(selectedDates, selectedHistories) {
    let filters = [];


    if (selectedDates && selectedDates.length > 0) {
        filters.push(`dateh_point IN (${selectedDates.map(date => `'${encodeURIComponent(date)}'`).join(',')})`);
    }
    if (selectedHistories && selectedHistories.length > 0) {
        filters.push(`nom_histoire IN (${selectedHistories.map(hist => `'${encodeURIComponent(hist)}'`).join(',')})`);
    }

    return filters.join(' OR ');
}

function reloadGeoServerLayer(cqlFilter) {
    let updatedGeoserverUrl = geoserverUrl; // Utiliser l'URL d'origine par défaut

    console.log(cqlFilter);

    // Mettre à jour l'URL avec le filtre s'il est spécifié
    if (cqlFilter) {
        updatedGeoserverUrl += `&CQL_FILTER=${cqlFilter}`;

        // Vérifier si le filtre contient à la fois une date et une histoire
        if (cqlFilter.includes('date') && cqlFilter.includes('histoire')) {
            // Supprimer la partie du filtre liée à la date
            let histoireFilter = cqlFilter.replace(/dateh_point = '[^']*'/, ''); // Supprimer le filtre de date

            // Chargement des données avec le filtre modifié (seulement sur l'histoire)
            load_file(updatedGeoserverUrl + `&CQL_FILTER=${histoireFilter}`, mesure)
                .then(function (geojsonData) {
                    // Appel de la fonction createChart pour créer le graphique
                    createChart(geojsonData);
                });
        } else {
            // Chargement des données avec le filtre d'origine
            load_file(updatedGeoserverUrl, mesure)
                .then(function (geojsonData) {
                    // Ne créer le graphique que si le filtre est uniquement sur l'histoire
                    if (cqlFilter.includes('histoire')) {
                        createChart(geojsonData);
                    }
                });
        }

    }

    console.log(updatedGeoserverUrl);

    // Reste du code pour recharger la couche GeoServer
    load_file(updatedGeoserverUrl, mesure)
        .then(function (newMeasure) {
            // Clear existing layers before adding the new one
            mesure.clearLayers();

            // Add the new filtered layer to the map
            newMeasure.addTo(mesure);

            // Update the control layers to reflect the filtered layer
            overlays_maps["Mesure"] = mesure;
            layerControl.remove(map);
            layerControl = L.control.layers(basemaps, overlays_maps).addTo(map);
        });
}



// Fonction pour gérer les boutons de filtre
function handleFilterButtonClick(applyFilters) {
    if (applyFilters) {
        const selectedDates = $('#dateh_point').val();
        const selectedHistories = $('input[name="nom_histoire"]:checked').map(function () {
            return this.value;
        }).get();

        const cqlFilter = createCqlFilter(selectedDates, selectedHistories);

        reloadGeoServerLayer(cqlFilter);
    } else {
        // Si on veut supprimer les filtres, on recharge simplement la couche sans aucun filtre
        reloadGeoServerLayer(); // Passer null ou undefined
        if (myChart) {
            myChart.destroy(); // Supprimer le graphique existant
        }
        let existingStoryInfo = document.querySelector('.story-info')
        if (existingStoryInfo) {
            existingStoryInfo.remove();
        }
        // Désélectionner tous les boutons radio
        $('input[name="nom_histoire"]').prop('checked', false);
    }
}

// Gestion des événements pour les boutons de filtre
// $('#applyFilterBtn').on('click', () => handleFilterButtonClick(true));
$('#clearFilterBtn').on('click', () => handleFilterButtonClick(false));

let myChart = null;
let chartDivCreated = false; // Initialisation du drapeau indiquant si la div chartDiv a été créée

async function createChart(geojsonData) {
    // Vérifiez si geojsonData est défini et s'il contient des couches
    if (!geojsonData || !geojsonData._layers) {
        console.error('Invalid or empty geojsonData');
        return;
    }

    // Récupération de l'élément parent où nous voulons ajouter notre nouvel élément
    let profileDiv = document.getElementById('profile');
    // Création de l'élément <div> avec le <canvas> à l'intérieur si ce n'est pas déjà fait
    if (!chartDivCreated) {
        let chartDiv = document.createElement('div');
        chartDiv.innerHTML = '<canvas id="myChart"></canvas>';



        // Ajout de l'élément <div> nouvellement créé à l'élément parent
        profileDiv.appendChild(chartDiv);

        chartDivCreated = true; // Met à jour le drapeau pour indiquer que la div chartDiv a été créée
    }

    // Récupération du contexte du canvas
    let ctx = document.getElementById('myChart').getContext('2d');

    // Si un graphique existe déjà, le détruire
    if (myChart) {
        myChart.destroy();
    }

    // Vérification et suppression de la div story-info existante
    let existingStoryInfo = document.querySelector('.story-info');
    if (existingStoryInfo) {
        existingStoryInfo.remove();
    }

    // Extraction des données pour le graphique
    let data = {
        labels: [], // Heures
        datasets: [{
            label: 'Apareil 1',
            data: [], // ID des points
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            borderDash: [5, 5]
        },
        {
            label: 'Apareil 2',
            data: [], // Heures et ID de l'histoire
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            borderDash: [5, 5]
        }]
    };

    let histoireName = null;
    let histoireDescription = null;

    // Parcours des couches pour extraire les données
    Object.values(geojsonData._layers).forEach(layer => {
        let feature = layer.feature;
        if (feature && feature.properties && feature.properties.dateh_point && feature.properties.mesure_app1 && feature.properties.mesure_app2) {
            let idHistoire = feature.properties.mesure_app2; // Extraire l'ID de l'histoire
            let idPoint = feature.properties.mesure_app1; // Extraire l'ID du point

            data.labels.push(data.labels.length + 1); // Ajouter l'heure au tableau des labels (position dans l'ordre)

            data.datasets[0].data.push(idPoint); // Ajouter l'ID du point au tableau des données du premier dataset
            data.datasets[1].data.push(idHistoire); // Ajouter l'heure et l'ID de l'histoire au tableau des données du deuxième dataset

            // Récupération du nom et de la description de l'histoire
            histoireName = feature.properties.nom_histoire;
            histoireDescription = feature.properties.description_histoire;
        }
    });

    // Configuration du graphique
    let options = {
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Heures'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Valeurs mesurées (V/m)'
                }
            }
        }
    };

    // Création du graphique avec Chart.js
    myChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });

    // Gestionnaire d'événements mouseenter pour chaque point du graphique
    document.getElementById('myChart').addEventListener('mouseenter', function (e) {
        let points = myChart.getElementsAtEventForMode(e, 'point', myChart.options);
        if (points.length > 0) {
            let index = points[0].index; // Index du point survolé
            let idPoint = data.datasets[0].data[index]; // ID du point correspondant
            let marker = findMarkerById(idPoint); // Trouver le marqueur correspondant sur la carte
            if (marker) {
                // Modifier la taille de l'icône du marqueur
                marker.setIcon(L.icon({
                    iconUrl: '/staticFiles/img/mes9.png', // Chemin vers le nouvel icône
                    iconSize: [50, 50], // Nouvelle taille de l'icône
                    popupAnchor: [0, -15]
                }));
            }
        }
    });

    // Gestionnaire d'événements mouseleave pour réinitialiser la taille de l'icône du marqueur
    document.getElementById('myChart').addEventListener('mouseleave', function (e) {
        // Réinitialiser la taille de l'icône du marqueur
        // (vous pouvez utiliser la même méthode pour réinitialiser la taille de l'icône à celle par défaut)
    });


    // Fonction pour trouver le marqueur correspondant sur la carte en fonction de l'ID du point
    function findMarkerById(idPoint) {
        // Parcours des marqueurs sur la carte
        for (let layerId in map._layers) {
            let layer = map._layers[layerId];
            if (layer instanceof L.Marker && layer.options.id === idPoint) {
                return layer; // Retourner le marqueur correspondant
            }
        }
        return null; // Aucun marqueur correspondant trouvé
    }



    // Création de la div pour le titre et la description de l'histoire
    let storyDiv = document.createElement('div');
    storyDiv.classList.add('story-info');
    storyDiv.innerHTML = `
        <h3>${histoireName}</h3>
        <p>${histoireDescription}</p>
    `;

    // Ajout de la div après le graphique
    profileDiv.appendChild(storyDiv);
}



// Exemple d'utilisation
let geoserverUrl = "geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Apoint_histoire&outputFormat=application%2Fjson";
loadFeatures(geoserverUrl);



document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const previewButton = document.querySelector('.preview-btn');
    const dataForm = document.getElementById('dataForm');

    previewButton.addEventListener('click', function () {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const geojson = JSON.parse(event.target.result);
                // Faites quelque chose avec le GeoJSON, comme l'afficher dans la console
                console.log(geojson);
            };
            reader.readAsText(file);
        } else {
            console.log('Aucun fichier sélectionné.');
        }
    });



});