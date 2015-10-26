var normalize = require('geojson-normalize'),
  gju = require('geojson-utils'),
  turf = require('turf'),
  lineclip = require('lineclip'),
  tilebelt = require('tilebelt'),
  sliceAtIntersect = require('turf-line-slice-at-intersection')
  lineChunk = require('turf-line-chunk');

module.exports = function (tileLayers, tile, done) {
  var osm = normalize(tileLayers.osm.osm);
  tile = tilebelt.tileToBBOX(tile);

  var footways = filterAndClipFootways(osm, tile),
    roads = filterAndClipRoads(osm, tile),
    proposals = [];

  for (var f = 0; f < footways.length; f++) {
    var segments = sliceAtIntersect(footways[f], turf.featurecollection(roads));

    // Find which of the remaining segments stay close to a road (should be a sidewalk)
    segments.features.forEach(function (segment) {
      // found a case where the original linestring is a single coordinate, not wrapped in an array
      if (segment.geometry.coordinates.length < 2 || !segment.geometry.coordinates[0].length) return;
      // skip short little segments
      if (turf.lineDistance(segment, 'miles') <= 10/5280) return;

      var segmented = lineChunk(segment, 250/5280, 'miles');

      segmented.features.forEach(function (seg) {
        if (turf.lineDistance(seg, 'miles') <= 150/5280) return;
        
        // Get bisectors fo this segment, and match it against 
        // each road.
        var bisectors = buildBisectors(seg);
        var isMatched = false;

        roads.forEach(function (road) {
          if (isMatched || road.properties.layer !== footways[f].properties.layer) return;

          var matched = 0;
          bisectors.forEach(function (bisector) {
            if (gju.lineStringsIntersect(bisector.geometry, road.geometry)) matched++;
          });
          if (matched / bisectors.length > 0.7) {
            isMatched = true;
            seg.properties['_osm_way_id'] = footways[f].properties._osm_way_id;
            seg.properties['proposed:footway'] = 'sidewalk';
            seg.properties['proposed:associatedStreet'] = road.properties.name;
            proposals.push(seg);
          }
        });
      });
    });
  }

  done(null, proposals);
};


/**
 * Generates array of potentially erroneous footways
 */
function filterAndClipFootways(osm, tile) {
  // Grab all footways missing footway=[sidewalk, crossing]
  var features = osm.features.filter(function (ft) {
    if (ft.properties.highway === 'footway' && ft.properties.footway !== 'sidewalk' && ft.properties.footway !== 'crossing') {
      return true;
    }
    return false;
  });

  return clipNormalize(features, tile);
}

/**
 * Generates an array of roads in the tile to check footways against
 */
function filterAndClipRoads(osm, tile) {
  var roadTypes = [
    'trunk_link',
    'trunk',
    'primary',
    'secondary',
    'tertiary',
    'unclassified',
    'residential',
    'road',
  ];

  var features = osm.features.filter(function (ft) {
    if (roadTypes.indexOf(ft.properties.highway) > -1) return true;
    return false;
  });

  return clipNormalize(features, tile);
}

/**
 * Clips line geometries against the bbox and normalizes to linestrings
 */
function clipNormalize(features, tile) {
  var newLines = [];

  for (var i = 0; i < features.length; i++) {
    var coords = (features[i].geometry.type === 'MultiLineString') ? 
      features[i].geometry.coordinates :
      [features[i].geometry.coordinates];

    for (var c = 0; c < coords.length; c++) {
      var lines = lineclip(coords[c], tile);
      for (var s = 0; s < lines.length; s++) {
        newLines.push(turf.linestring(lines[s], features[i].properties));
      }
    }
  }
  
  return newLines;
}

/**
 * Generates bisectors for all the given footway segments. 
 * Bisectors are generated every 20 feet, and extend 75 feet on either
 * side of the street. 
 */
function buildBisectors(footwaySegment) {
  var bisectors = [];
  var segmented = lineChunk(footwaySegment, 50/5280, 'miles');

  segmented.features.forEach(function (segment) {
    var seglen = segment.geometry.coordinates.length;
    var endpoint = turf.point(segment.geometry.coordinates[seglen - 1]);
    var bearing = turf.bearing(
      turf.point(segment.geometry.coordinates[seglen - 2]), endpoint);

    var start = turf.destination(endpoint, 75/5280, bearing - 90, 'miles');
    var end = turf.destination(endpoint, 75/5280, bearing + 90, 'miles');
    bisectors.push(turf.linestring([start.geometry.coordinates, end.geometry.coordinates]));
  });
  

  return bisectors;
}