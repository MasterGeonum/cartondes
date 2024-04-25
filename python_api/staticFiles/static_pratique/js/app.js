var map = L.map('map', {
    maxZoom: 25,
    minZoom: 5
}).setView([45.77851, 4.82985], 15);

var sidebar = L.control.sidebar('sidebar').addTo(map);

var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 25,
    minZoom: 5,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var stadiaLayer = L.tileLayer(
    "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    {
        maxZoom: 25,
        minZoom: 5,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
    }
).addTo(map);

function getIconUrl(d) {
    return `/staticFiles/img/mes${d}.png`;
}

function iconMesure(feature) {
    return {
        iconUrl: getIconUrl(feature.properties.id_histoire),
        iconSize: [35, 35]
    };
}

function iconAntenne(feature) {
    let scale = feature.properties.nb_antenne / 35;

    // Définir une taille minimale pour les icônes
    let minSize = 20; // Taille minimale en pixels

    // Multiplier l'échelle par un facteur pour rendre les icônes plus grandes
    scale *= 2; // Vous pouvez ajuster ce facteur selon vos besoins

    // Vérifier si la taille calculée est inférieure à la taille minimale
    if (scale * 35 < minSize) {
        scale = minSize / 35; // Ajuster l'échelle pour atteindre la taille minimale
    }

    return {
        iconUrl: '/staticFiles/img/pin2.png',
        iconSize: [35 * scale, 41 * scale]
    };
}

async function load_file(url, layerGroup) {
    let response = await fetch(url);
    let layer = await response.json();

    let features = layer.features;
    let firstPointIndex = 0;
    let lastPointIndex = features.length - 1;

    let geojsonLayer = L.geoJSON(features, {
        pointToLayer: function (feature, latlng) {
            let icon;
            if (url === site) {
                icon = L.icon(iconAntenne(feature));
            } else {
                icon = L.icon(iconMesure(feature));
            }
            let marker = L.marker(latlng, { icon: icon });

            let index = features.indexOf(feature);
            if (index === firstPointIndex || index === lastPointIndex) {
                // Extrait l'index du point dans le tableau des caractéristiques
                let pointNumber = index === firstPointIndex ? "Premier" : "Dernier";
                let pointDiv = document.createElement('div');
                pointDiv.innerHTML = (index + 1).toString(); // Ajoute 1 car les index de tableau commencent à 0
                marker.bindTooltip(pointDiv, {
                    permanent: true,
                    className: 'point-tooltip',
                    direction: 'bottom', // Direction de l'affichage de la bulle
                    offset: [0, 10], // Décalage de la position de la bulle par rapport au marqueur
                    opacity: 0.7, // Opacité de la bulle
                    background: 'white', // Couleur de fond de la bulle
                    borderColor: 'blue', // Couleur de la bordure de la bulle
                    borderRadius: 100, // Rayon de bordure pour arrondir les coins
                    borderWidth: 1, // Épaisseur de la bordure
                    fontWeight: 'bold', // Style de la police
                    fontSize: '12px' // Taille de la police
                }).openTooltip();
            }

            return marker;
        },
        onEachFeature: function (feature, layer) {
            let popupContent = "";
            if (url === site) {
                popupContent = "<br>Nombre d'antennes: " + feature.properties.nb_antenne;
            } else {
                popupContent = "Date et heure de la mesure: " + feature.properties.dateh_point +
                    "<br>Description: " + feature.properties.description_point;
            }
            layer.bindPopup(popupContent);
        }
    });

    geojsonLayer.addTo(layerGroup);

    if (url !== site) {
        //map.fitBounds(geojsonLayer.getBounds());
    }

    return geojsonLayer;
}






let mesure = L.layerGroup();
let site_a = L.layerGroup();
let batiment_m = L.layerGroup();

let point_mesure = "http://localhost:8080/geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Apoint_histoire&outputFormat=application%2Fjson";
let site = "http://localhost:8080/geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Asite&outputFormat=application%2Fjson";
let wmsbati = L.tileLayer.wms('http://localhost:8080/geoserver/cartondes/wms?service=WMS', {
    layers: 'cartondes:batiment',
    format: 'image/png',
    transparent: true,
    minZoom: 14
}).addTo(batiment_m);

load_file(point_mesure, mesure);
load_file(site, site_a);

var basemaps = {
    "OpenStreetMap": osm,
    stadiaLayer: stadiaLayer
};

var overlays_maps = {
    "Mesure": mesure.addTo(map),
    "Sites radio": site_a,
    "Batiments": batiment_m
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
    let historyMap = []; // Objet pour stocker les noms d'histoire et leurs IDs

    features.forEach(feature => {
        let description = feature.properties.description_point;
        let date = feature.properties.dateh_point;
        let historyName = feature.properties.nom_histoire;
        let historyId = feature.properties.id_histoire;

        if (description && !uniqueDescriptions.includes(description)) {
            uniqueDescriptions.push(description);
        }
        if (date && !uniqueDates.includes(date)) {
            uniqueDates.push(date);
        }
        if (historyName && !uniqueHistories.includes(historyName)) {
            uniqueHistories.push(historyName);
            // Stocker le nom d'histoire et son ID dans l'objet historyMap
            historyMap[historyName] = historyId;
        }
    });

    createDropdown(uniqueHistories, 'nom_histoire', 'Nom d\'histoire', historyMap);
}



function createDropdown(values, id, label, historyMap) {
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
            // Récupérer l'objet correspondant à la valeur actuelle dans historyMap
            let history = historyMap[value];
            let radioInput = $(`<div class="radio-input">
                                    <input type="radio" id="${value.replace(/\s+/g, '_').toLowerCase()}" name="${id}" value="${value}">
                                    <label for="${value.replace(/\s+/g, '_').toLowerCase()}">${value}</label>
                                    <img src="/staticFiles/img/mes${history}.png" alt="${value}" class="radio-icon" style="height: 20px; width: 20px;"> <!-- Image -->
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
    let updatedGeoserverUrl = filtre_point; // Utiliser l'URL d'origine par défaut

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
console


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
        chartDiv.innerHTML = '<div class="chart-container"><canvas class="filter-chart" id="myChart"></canvas>';



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
            label: 'TES92',
            data: [], // ID des points
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            borderDash: [5, 5]
        },
        {
            label: 'Cornet',
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
                    text: 'Identifiant du point'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Valeurs mesurées (V/m)'
                }
            }
        },
        // plugins: {
        //     legend: {
        //         display:false,
        //     }
        // }

    };

    // Création du graphique avec Chart.js
    myChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });


    // Création de la div pour le titre et la description de l'histoire
    let storyDiv = document.createElement('div');
    storyDiv.classList.add('story-info');
    if (histoireDescription === null) {
        storyDiv.innerHTML = `
        <h3>${histoireName}</h3>
    `;
    } else {
        storyDiv.innerHTML = `
        <h3>${histoireName}</h3>
        <p>${histoireDescription}</p>
    `;
    }


    // Ajout de la div après le graphique
    profileDiv.appendChild(storyDiv);
}

// Exemple d'utilisation
let filtre_point = "http://localhost:8080/geoserver/cartondes/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=cartondes%3Apoint_histoire&outputFormat=application%2Fjson";
loadFeatures(filtre_point);

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const dataForm = document.getElementById('fileUploadForm');
    const dataTable = document.getElementById('dataTable');

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const fileType = getFileType(file.name);
                if (fileType === 'csv') {
                    const csvData = event.target.result;
                    processDataFromCSV(csvData);
                } else if (fileType === 'kml') {
                    const kmlData = event.target.result;
                    processDataFromKML(kmlData);
                } else {
                    alert('Format de fichier non pris en charge.');
                }
            };
            reader.readAsText(file);
        } else {
            alert('Aucun fichier sélectionné.');
        }
    });

    function getFileType(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        if (extension === 'csv') {
            return 'csv';
        } else if (extension === 'kml') {
            return 'kml';
        } else {
            return 'unknown';
        }
    }

    function processDataFromKML(kmlData) {
        const dataTable = document.getElementById('dataTable');
        if (!dataTable) {
            console.error('Element with ID "dataTable" not found.');
            return;
        }

        // Utilisez un parseur XML pour traiter le fichier KML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlData, 'text/xml');

        // Sélectionnez tous les éléments <Placemark> dans le fichier KML
        const placemarks = xmlDoc.querySelectorAll('Placemark');

        let tableRows = document.getElementById('dataTable');

        // Créez l'en-tête du tableau
        const tableHeader = `<tr>
                                <th>Date / Heure</th>
                                <th>TES92</th>
                                <th>Cornet</th>
                                <th>Description</th>
                             </tr>`;
        tableRows.innerHTML = tableHeader

        let indice = 1
        // Parcourez chaque élément <Placemark> pour extraire les données
        placemarks.forEach(placemark => {
            // Récupérez la date du timestamp (if available)
            const timestampElement = placemark.querySelector('Placemark SimpleData[name="timestamp"]');
            const timestamp = timestampElement.textContent;

            // Récupérez les coordonnées de Point
            const coordinates = placemark.querySelector('Point coordinates') ? placemark.querySelector('Point coordinates').textContent : '';
            coordx = coordinates.split(',')[0]
            coordy = coordinates.split(',')[1]
            // Créez une ligne de tableau avec les données extraites
            const tr = document.createElement('tr')
            const td1 = document.createElement('td')
            const inpt = document.createElement('input')
            inpt.name = `times_${indice}`
            inpt.value = `${timestamp}`
            inpt.size = '10'
            inpt.readOnly = true
            td1.appendChild(inpt)
            const inpcoord = document.createElement('input')
            inpcoord.type = 'hidden'
            inpcoord.name = `coord_${indice}`
            inpcoord.value = `${coordx}/${coordy}`
            td1.appendChild(inpcoord)
            tr.appendChild(td1)
            const td3 = document.createElement('td')
            const inp = document.createElement('input')
            inp.type = 'number'
            inp.size = '6'
            inp.min = '0'
            inp.name = `app1_${indice}`
            inp.oninput = "this.value = Math.abs(this.value)"
            inp.step = "0.01"
            inp.required = true
            td3.appendChild(inp)
            tr.appendChild(td3)
            const td4 = document.createElement('td')
            const inp2 = document.createElement('input')
            inp2.type = 'number'
            inp2.size = '6'
            inp2.min = '0'
            inp2.name = `app2_${indice}`
            inp2.oninput = "this.value = Math.abs(this.value)"
            inp2.step = "0.01"
            inp2.required = true
            td4.appendChild(inp2)
            tr.appendChild(td4)
            const td5 = document.createElement('td')
            const inp3 = document.createElement('input')
            inp3.type = 'text'
            inp3.size = '20'
            inp3.name = `desc_${indice}`
            td5.appendChild(inp3)
            tr.appendChild(td5)

            tableRows.appendChild(tr)
            indice++
            //  += `<tr>
            //                 <td>${timestamp}</td>
            //                 <td>${rx} / ${ry}</td>
            //                 <td><input id="lkjlkj" name="lkjlkj" type="number" size="6" min="0" oninput="this.value = Math.abs(this.value)" step="0.01" required></td> <!-- Input pour Appareil 2 -->
            //                 <td><input name="kkmlkm" type="number" size="6" min="0" oninput="this.value = Math.abs(this.value)" step="0.01" required></td> <!-- Input pour Appareil 1 -->
            //                 <td><input type="text"></input></td> <!-- Textarea pour Description -->
            //              </tr>`;
        });
        // Valeur du timestamp
        // Mettez à jour le contenu du tableau avec les lignes générées
        //dataTable.querySelector('tbody').appendChild(tr) // innerHTML = tableHeader + tableRows;

    }

    // Écouter le clic sur le bouton Ajouter
    dataForm.addEventListener('submit', function (event) {
        var form = document.getElementById('fileUploadForm');
        console.log("OKKKKK")
        var formData = new FormData(form);
        var requestOptions = {
            method: 'POST',
            body: formData
        };
        var apiUrl = 'http://localhost:1234/addRoute';

        fetch(apiUrl, requestOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la requête : ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('Réponse de l\'API :', data);
            })
            .catch(error => {
                console.error('Erreur lors de la requête :', error);
            });

        //     event.preventDefault(); // Empêche le formulaire de se soumettre

        //     // Récupérer les données du formulaire (sauf le tableau)
        //     const histoireName = document.getElementById('histoireName').value;
        //     const histoireDescription = document.getElementById('histoireDescription').value;

        //     // Récupérer les données du tableau
        //     const mesureRowsData = [];
        //     const rows = dataTable.querySelectorAll('tbody tr');
        //     rows.forEach(row => {
        //         const cells = row.querySelectorAll('td');
        //         // Vérifier si la ligne contient des cellules
        //         if (cells.length === 5) { // Assurez-vous qu'il y a 5 cellules dans chaque ligne
        //             const rowData = {
        //                 timestamp: cells[0].textContent,
        //                 coordinates: cells[1].textContent,
        //                 appareil1: cells[2].querySelector('input').value,
        //                 appareil2: cells[3].querySelector('input').value,
        //                 description: cells[4].querySelector('textarea').value
        //             };
        //             mesureRowsData.push(rowData);
        //         }
        //         //  else {
        //         //     console.error('Erreur: Structure de tableau incorrecte.');
        //         // }
        //     });

        //     // Envoyer les données à l'API
        //     sendDataToAPI({ histoireName, histoireDescription, mesureRows: mesureRowsData });
    });


    function sendDataToAPI(data) {
        console.log(data.histoireDescription)
        console.log(data.histoireName)
        data.mesureRows.forEach(row => {
            const query = `INSERT INTO referenciel.point_mesure (geom, dateh_point, mesure_app1, mesure_app2, description_point) VALUES ('${row.coordinates}', '${row.timestamp}', ${row.appareil1}, ${row.appareil2}, '${row.description}')`;
            console.log(query);
        });
        // Effectuer une requête POST à votre API
        fetch('votre_url_api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la requête.');
                }
                return response.json();
            })
            .then(data => {
                alert('Données envoyées avec succès :', data);
                // Réinitialiser le formulaire après l'envoi
                dataForm.reset();
                // Réinitialiser le tableau
                dataTable.querySelector('tbody').innerHTML = '';
            })
            .catch(error => {
                alert('Erreur :', error);
            });
    }

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
    let couchesActivées = couchesActivées2.filter(function (e) { return e !== 'Stadia maps' })  // Si aucune couche n'est cochée, masquez la div legende-container
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
