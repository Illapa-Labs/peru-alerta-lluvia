"""Arma public/data/peru-departamentos.geojson con los límites departamentales oficiales del SENAMHI.

Fuente: capa «Límite departamental» del GeoServer de IDESEP (g_00_02:00_02_002_03_000_000_0000_00_00), con el código
INEI de cada departamento. Se simplifica manteniendo los bordes compartidos alineados (sin huecos ni superposiciones)
con la mayor tolerancia que no pase el tamaño del archivo anterior, para que la web no baje más datos.

Uso (Python 3 con shapely 2.1 o más reciente):
    curl -o dep.json "https://idesep.senamhi.gob.pe/geoserver/g_00_02/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=g_00_02:00_02_002_03_000_000_0000_00_00&outputFormat=application/json&srsName=EPSG:4326"
    python scripts/limites-departamentos.py dep.json public/data/peru-departamentos.geojson nuevo.geojson
"""
import json, sys
import shapely
from shapely.geometry import shape, mapping

SRC, CURRENT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
NAMES = {'AMAZONAS': 'Amazonas', 'ANCASH': 'Áncash', 'APURIMAC': 'Apurímac', 'AREQUIPA': 'Arequipa', 'AYACUCHO': 'Ayacucho',
         'CAJAMARCA': 'Cajamarca', 'CALLAO': 'Callao', 'CUSCO': 'Cusco', 'HUANCAVELICA': 'Huancavelica', 'HUANUCO': 'Huánuco',
         'ICA': 'Ica', 'JUNIN': 'Junín', 'LA LIBERTAD': 'La Libertad', 'LAMBAYEQUE': 'Lambayeque', 'LIMA': 'Lima',
         'LORETO': 'Loreto', 'MADRE DE DIOS': 'Madre de Dios', 'MOQUEGUA': 'Moquegua', 'PASCO': 'Pasco', 'PIURA': 'Piura',
         'PUNO': 'Puno', 'SAN MARTIN': 'San Martín', 'TACNA': 'Tacna', 'TUMBES': 'Tumbes', 'UCAYALI': 'Ucayali'}

src = json.load(open(SRC))['features']
props = [{'name': NAMES[f['properties']['nombdep'].strip().upper()], 'ubigeo': str(f['properties']['iddpto']).zfill(2)} for f in src]
geoms = [shapely.make_valid(shape(f['geometry'])) for f in src]
limit = len(open(CURRENT, 'rb').read())
CALLAO_TOL = 0.002


def rounded(geom):
    return shapely.set_precision(geom, 0.001)


def build(tol):
    simple = list(shapely.coverage_simplify(geoms, tol))
    # El Callao es tan chico que con la tolerancia general pierde distritos enteros: va con más detalle, y Lima
    # toma su borde con el Callao de esa versión (así siguen sin huecos ni superposiciones)
    fine = shapely.coverage_simplify(geoms, CALLAO_TOL)
    ci = [p['name'] for p in props].index('Callao'); li = [p['name'] for p in props].index('Lima')
    simple[li] = shapely.make_valid(simple[li].union(simple[ci]).difference(fine[ci]))
    simple[ci] = fine[ci]
    feats = []
    for p, g in zip(props, simple):
        g = rounded(g)
        # Fuera las islitas que quedaron de menos de ~1 km²
        if g.geom_type == 'MultiPolygon':
            parts = [x for x in g.geoms if x.area > 0.0001]
            g = shapely.MultiPolygon(parts) if len(parts) > 1 else parts[0]
        feats.append({'type': 'Feature', 'properties': p, 'geometry': mapping(g)})
    text = json.dumps({'type': 'FeatureCollection', 'features': feats}, ensure_ascii=False, separators=(',', ':'))
    return text, simple


best = None
for tol in [0.04, 0.042, 0.045, 0.05]:
    text, simple = build(tol)
    size = len(text.encode())
    print(f'tolerancia {tol}: {size} bytes')
    if size <= limit:
        best = (tol, text, simple)
        break
tol, text, simple = best
open(OUT, 'w').write(text)
print(f'elegida {tol}: {len(text.encode())} bytes (actual {limit})')
