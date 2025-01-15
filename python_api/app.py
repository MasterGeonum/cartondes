import psycopg2
import os

from pyproj import Proj, Transformer

from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS  # Classe CORS pour éviter erreurs X Domains 

app = Flask(__name__, template_folder='templateFiles', static_folder='staticFiles')
app.secret_key = "37446a6167b6aef792f1945da08ce7276a5282d50adad6ba978ecc2dbf418542"
CORS(app)  # Activez CORS pour votre application Flask 

# ROUTES HTML
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/informations')
def infos():
    return render_template('informations.html')

utilisateurs = [
    { "nom": os.environ['CARTONDES_USER'], "mdp": os.environ['CARTONDES_PASSWORD']},
]

def recherche_utilisateur(nom_utilisateur, mot_de_passe):
    """ Vérifie les informations de connexion fournies
    Renvoie un dictionnaire-utilisateur si OK
    Sinon None"""
    for utilisateur in utilisateurs:
        if utilisateur['nom'] == nom_utilisateur and utilisateur['mdp'] == mot_de_passe:
            return utilisateur
    return None


@app.route('/expositionTheorique')
def theorique():
    return render_template('map_theorique.html')

@app.route('/expositionMesuree')
def mesureee():
    return render_template('map_pratique.html', user_connecte = False)

# ROUTES API
################################
@app.route("/login", methods=["POST", "GET"])
def login():
    """ Page de connexion """
    if request.method == "POST":
        donnees = request.form
        nom = donnees.get('nom')
        mdp = donnees.get('mdp')
        
        print(nom, mdp)

        utilisateur = recherche_utilisateur(nom, mdp)

        if utilisateur is not None:
            print('Utilisateur trouvé')
            session["nom_utilisateur"] = utilisateur['nom']
            print(session)
            return redirect(url_for('index'))
        else:
            print('Utilisateur inconnu')
            return redirect(request.url)
    else:
        if 'nom_utilisateur' in session:
            return redirect(url_for('index'))   
        return render_template("login.html")

@app.route('/logout')
def logout():
    """ Déconnexion"""
    print(session)
    session.pop('nom_utilisateur', None)
    print(session)
    return redirect(url_for('index'))

ADD_STORY_RETURN_ID = "INSERT INTO referentiel.histoire (nom_histoire, description_histoire) VALUES (%s, %s) RETURNING id_histoire;"
ADD_POINT_MESURES = "INSERT INTO referentiel.point_mesure(geom, description_point, mesure_app1, mesure_app2, id_histoire, dateh_point) VALUES (ST_SetSRID(ST_MakePoint(%s, %s), 2154), %s, %s, %s, %s, %s) RETURNING id_point_mesure;"
@app.route("/addStory", methods=["POST"])
def addStory():
    """ Ajout d'une histoire """
    donnees = request.form
    print(donnees)
    
    # Création d'une histoire avec récupération id
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    nomh = request.form.get('histoireName')
    desch  = request.form.get('histoireDescription')
    nb_points = int((len(list(request.form.keys())) - 3) / 4) # champs (nom, description, fichier) exclus 
    print(f"Il y a {nb_points} points dans le fichier.")
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(ADD_STORY_RETURN_ID, (nomh, desch,))
            histoire_id = cursor.fetchone()[0] if cursor.rowcount > 0 else None
    if histoire_id is not None:
        with connection:
            for i in range(1, nb_points + 1):
                coordp = request.form.get("coord_" + str(i))
                descp = request.form.get("desc_" + str(i)) 
                app1 = request.form.get("app1_" + str(i))
                app2 = request.form.get("app2_" + str(i))
                times = request.form.get("times_" + str(i))
                print(coordp, descp, app1, app2, histoire_id)

                if isinstance(coordp, str) and coordp:
                    latitude, longitude = coordp.split('/')

                    # Convertir latitude et longitude en nombre
                    latitude = float(latitude)
                    longitude = float(longitude)

                    # Transformer les coordonnées WGS84 en Lambert93
                    transformer = Transformer.from_crs("EPSG:4326", "EPSG:2154")
                    x, y = transformer.transform(longitude, latitude)

                    with connection.cursor() as cursor:
                        cursor.execute(ADD_POINT_MESURES, (x, y, descp, app1, app2, histoire_id, times))
                        point_id = cursor.fetchone()[0] if cursor.rowcount > 0 else None
                        print(f"Point#{point_id} créé.")

    return render_template('map_pratique.html')




# APPAREILS
################################
# get all
SELECT_ALL_APPAREILS = "SELECT * FROM referentiel.appareil;"
@app.route("/appareil", methods=["GET"])
def get_all_appareils():
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")

    with connection:
        with connection.cursor() as cursor:
            cursor.execute(SELECT_ALL_APPAREILS)
            appareils = cursor.fetchall()
            if appareils:
                result = []
                for appareil in appareils:
                    result.append({"id": appareil[0], "name": appareil[1]})
                return jsonify(result)
            else:
                return jsonify({"error": f"No appareils found."}), 404

# get one
@app.route("/appareil/<int:appareil_id>", methods=["GET"])
def get_appareil(appareil_id):
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM referentiel.appareil WHERE id_appareil = %s", (appareil_id,)) 
            appareil = cursor.fetchone()
            if appareil:
                return jsonify({"id_appareil": appareil[0], "description_appareil": appareil[1]})
            else:
                return jsonify({"error": f"Appareil with id_appareil {appareil_id} not found."}), 404

# insert
INSERT_APPAREIL_RETURN_ID = "INSERT INTO referentiel.appareil (description_appareil) VALUES (%s) RETURNING id_appareil;"
@app.route("/appareil", methods=["POST"])
def create_appareil():
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    data = request.get_json()
    desc = data["description_appareil"]
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(INSERT_APPAREIL_RETURN_ID, (desc,))
            appareil_id = cursor.fetchone()[0]
    return {"id_appareil": appareil_id, "description_appareil": desc, "message": f"Appareil {desc} created."}, 201

# delete
DELETE_APPAREIL_by_id="DELETE FROM referentiel.appareil WHERE id_appareil = %s;"
@app.route("/appareil/<int:appareil_id>", methods=["DELETE"])
def delete_user(appareil_id):
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM referentiel.appareil WHERE id_appareil = %s", (appareil_id,))
            if cursor.rowcount == 0:
                return jsonify({"error": f"Appareil with ID {appareil_id} not found."}), 404
    return jsonify({"message": f"Appareil with ID {appareil_id} deleted."})

################################
# POINTS DE MESURE
################################
# get all
SELECT_ALL_POINTS = "SELECT id_point_mesure, description_point, ST_AsText(geom) as geom, ST_X(ST_Transform(geom, 4326)) as long, ST_Y(ST_Transform(geom, 4326)) as lat FROM referentiel.point_mesure;"
@app.route("/pointMesure", methods=["GET"])
def get_all_points():
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(SELECT_ALL_POINTS)
            points = cursor.fetchall()
            if points:
                result = []
                for point in points:
                    result.append({"id": point[0], "description": point[1], "geom": point[2], "lat": point[4], "lng": point[3], "latLng": [point[4], point[3]]})
                return jsonify(result)
            else:
                return jsonify({"error": f"No points found."}), 404

# insert
INSERT_POINTMESURE_RETURN_ID = "INSERT INTO referentiel.point_mesure (geom, description_point_mesure) VALUES (ST_GeomFromText(%s), %s) RETURNING id_point_mesure;"
@app.route("/pointMesure", methods=["POST"])
def create_point():
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    data = request.get_json()
    desc = data["description_point"]
    lat = data["geometry"]["coordinates"][0][0]
    lon = data["geometry"]["coordinates"][0][1]
    
    geom2 = f"POINT({lat} {lon})"
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO referentiel.point_mesure (description_point, geom) VALUES ('" + desc + "', ST_GeomFromText('" + geom2 + "')) RETURNING id_point_mesure;")
            point_mesure_id = cursor.fetchone()[0]
    return {"point_mesure_id": point_mesure_id, "description_point_mesure": desc, "message": f"Point_mesure {desc} created."}, 201


################################
# HISTOIRE
################################
# get all
SELECT_ALL_HISTOIRE = "SELECT * FROM referentiel.histoire;"
@app.route("/histoire", methods=["GET"])
def get_all_histoires():
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    with connection:
        with connection.cursor() as cursor:
            cursor.execute(SELECT_ALL_HISTOIRE)
            histoires = cursor.fetchall()
            if histoires:
                result = []
                for histoire in histoires:
                    result.append({"id_histoire": histoire[0], "description_histoire": histoire[1], "date_histoire": histoire[2]})
                return jsonify(result)
            else:
                return jsonify({"error": f"No histoires found."}), 404

# insert
INSERT_HISTOIRE_RETURN_ID = "INSERT INTO referentiel.histoire (description_histoire) VALUES (%s) RETURNING id_histoire;"
@app.route("/histoire", methods=["POST"])
def create_histoire():
    connection = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")
    data = request.get_json()
    desc = data["description_histoire"]
    
    with connection:
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO referentiel.histoire (description_histoire) VALUES ('" + desc + "') RETURNING id_histoire;")
            histoire_id = cursor.fetchone()[0]
    return {"histoire_id": histoire_id, "description_histoire": desc, "message": f"Histoire {desc} created."}, 201

################################
# BATIMENTS
################################
# get around a site
SELECT_BATIMENTS_SITE = """
    SELECT b.usage_batiment, b.hauteur_batiment, b.population_batiment, b.population_inf_10, b.population_sup_65, b.population_sup_10_inf_65, b.surface_batiment, st_astext(st_transform(ST_Force2D(b.geom),4326)) as geom
    FROM referentiel.site s
    LEFT JOIN referentiel.batiment b on (ST_Distance(s.geom, st_centroid(b.geom)) < %s)
    WHERE s.id_site = %s;
"""
@app.route("/batiment/<int:site_id>/<int:distance>", methods=["GET"])
def get_batiments_around_site(site_id, distance):

    conn = psycopg2.connect(f"dbname='cartondes' user='cartondes_dba' host={os.environ['POSTGRES_HOST']} password={os.environ['POSTGRES_PASSWORD']}")

    with conn:
        with conn.cursor() as cursor:
            print(f"site : {site_id}")
            print(f"distance : {distance}")
            cursor.execute(SELECT_BATIMENTS_SITE, (distance, site_id))
            batiments = cursor.fetchall()
            prop = []
            for i in batiments:
                geom = []
                for j in i[7][15:-3].split(","):
                    geom.append(list([float(j.replace('(','').replace(')','').split(" ")[0]), float(j.replace('(','').replace(')','').split(" ")[1])]))

                    const = {
                    "type": "Feature",
                    "properties": {
                        "usage_batiment": i[0],
                        "hauteur_batiment": i[1],
                        "population_batiment": i[2],
                        "population_inf_10": i[3],
                        "population_sup_65": i[4],
                        "population_sup_10_inf_65": i[5],
                        "surface_batiment": i[6],
                    },
                    "geometry": {"type": "MultiPolygon", "coordinates": [[geom]]},
                }
                prop.append(const)


            json_file = {"type": "FeatureCollection",
            "name": "batiment",
            "crs" :  { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::4326" } },
            "features": prop
            }
            return jsonify(json_file)


app.run(host='0.0.0.0', port=1234, debug=True)
