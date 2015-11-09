var normalize = require('geojson-normalize'),
  gju = require('geojson-utils'),
  turf = require('turf'),
  tilebelt = require('tilebelt'),
  lineChunk = require('turf-line-chunk'),
  sliceAtIntersect = require('turf-line-slice-at-intersection'),
  rbush = require('rbush');

module.exports = function (tileLayers, tile, done) {

  var footways = filterAndClipFootways(tileLayers.osm.osm, tile),
    roads = filterAndClipRoads(tileLayers.osm.osm, tile),
    proposals = [];
    
  var roadIndex = rbush();

  for(var r = 0; r < roads.length; r++) {
    roadIndex.insert(turf.extent(roads[r]).concat({road_id: r}));
  }

  for (var f = 0; f < footways.length; f++) {
    var segments = sliceAtIntersect(footways[f], findProbablyIntersects(footways[f], roadIndex, roads));

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

        var bisectBox = turf.extent(turf.featurecollection(bisectors));
        var maybeCollides = roadIndex.search(bisectBox);

        maybeCollides.forEach(function (maybe) {
          var road = roads[maybe[4].road_id];
        
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
            console.log(JSON.stringify(seg));
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
  var features = [];

  var keepSurfaces = [
    'paved',
    'concrete',
    'asphalt',
    'concrete:plates',
    'cobblestone',
    'cobblestone:flattened',
    'sett',
  ];

  for (var i = 0; i < osm.length; i++) {
    var ft = osm.feature(i);
    // Grab all footways missing footway=[sidewalk, crossing].
    // Exclude surfaces not in our keep list
    if (ft.properties.highway === 'footway' 
      && ft.properties.footway !== 'sidewalk' 
      && ft.properties.footway !== 'crossing'
      && (!ft.properties.surface || keepSurfaces.indexOf(ft.properties.surface) > -1)
    ) {
      features.push(ft.toGeoJSON(tile[0], tile[1], tile[2]));
    }
  }

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

  var features = [];
  for (var i = 0; i < osm.length; i++) {
    var ft = osm.feature(i);
    // Grab all footways missing footway=[sidewalk, crossing]
    if (roadTypes.indexOf(ft.properties.highway) > -1) {
      features.push(ft.toGeoJSON(tile[0], tile[1], tile[2]));
    }
  }

  return clipNormalize(features, tile);
}

/**
 * normalizes the input features to linestrings
 */
function clipNormalize(features, tile) {
  var newLines = [];

  for (var i = 0; i < features.length; i++) {
    var coords = (features[i].geometry.type === 'MultiLineString') ? 
      features[i].geometry.coordinates :
      [features[i].geometry.coordinates];

    for (var c = 0; c < coords.length; c++) {
      newLines.push(turf.linestring(coords[c], features[i].properties));
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

/**
 * Using our rbush index, find which roads probably intersect the sidewalk
 */
function findProbablyIntersects(footway, roadIndex, roads) {
  var extent = turf.extent(footway);

  var colliding = roadIndex.search(extent);
  var fc = [];


  for (var i = 0; i < colliding.length; i++) {
    fc.push(roads[colliding[i][4].road_id])
  }

  return turf.featurecollection(fc);
}

