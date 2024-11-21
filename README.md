# Cartondes

Cette application repose sur un serveur développé en python sur le avec le framework Flask. Ses données sont stockées dans une base de données PostgreSql / PostGIS. Elles sont également servies par un serveur Geoserver.

Ce serveur définit deux types de routes :
- l'interrogation des données stockées dans la base ;
- les pages html qui affichent ces données.

## Contenu du repo
- **<dossier_de_l_application>/** La racine de l'application. Sur ce repo, il s'agit de */python_api/*.
- **<dossier_de_l_application>/app.py** Le fichier python décrivant le serveur Flask et les routes servies.
- **<dossier_de_l_application>/dump_cartondes.sql** Le dump sql de la base de données. Il ne contient pas les instructions CREATE et DROP DATABASE. Vérifier que l'utilisateur cartondes_dba existe au préalable.
- **<dossier_de_l_application>/staticFiles/** Les fichiers statiques de l'application (feuilles de styles CSS, scripts Javascript, images, ... On trouve également ici deux subdivisions :
  - **<dossier_de_l_application>/staticFiles/static_pratique** pour les éléments spécifiques à l'exposition mesurée ;
  - **<dossier_de_l_application>/staticFiles/static_theorique** pour l'exposition théorique.
- **<dossier_de_l_application>/templateFiles/** Les pages html servies par le serveur.

## Installation
### Décompression des sources dans <dossier_de_l_application>
### Configuration de la base de données
Les données fournies (dump sql) doivent être importées dans une base de données nommée **cartondes** appartenant à l'utilisateur **cartondes_dba**.

### Configuration du serveur Geoserver
Créer un entrepot **cartondes**, connecté à la base de données.
Publier les couches :
- Limites_Lyon
- Sites_antennes
- batiment
- point_histoire

### Exécuter
python app.py

 ## Fonctionnement général
 La racine de l'application permet d'accéder aux fonctions d'affichage des expositions mesurées et théoriques.
 Un utilisateur authentifié peut, en plus, importer des séries de mesures appelées *histoires*.

 Lorsque le serveur reçoit une requête de navigation, il affiche le template correspondant à l'url demandée.

 Le template est affiché avec les mécanismes standards du web :
 - structure html
 - style css
 - interactions javascript.

Dans le cas présent, le code javascript récupère des données
- soit auprès du serveur Geoserver
- soit auprès de l'API Flask pour certaines routes.

Les données sont ensuite affichées sous forme de cartes avec la bibliothèque *leaflet*, ou de graphiques avec *Chart.js*.

### Exposition théorique
Cette interface permet de se placer
- du point de vue des antennes (nombre d'habitants et de batiments autour d'une antenne, dans un certain rayon)
- du point de vue des habitants (antennes les plus proches)

### Exposition mesurée
Cette interface permet d'afficher des *histoires*. Elles sont constituées de mesures ayant une thématique précise (l'étude d'un site à une heure donnée, un parcours particulier, ...). Il est possible de sélectionner une histoire à afficher et de voir sur la carte le parcours suivi par l'observateur et la valeur des mesures d'exposition par deux appareils différents pour chacun des points de mesure.
Il est également possible, pour un utilisateur authentifié, d'ajouter des données en important un fichier kml constitué des points d'une histoire. Une fois le fichier chargé, il est possible de renseigner les valeurs mesurées par les deux appareils aux différents points, d'enregistrer ces données en base et de les afficher.
