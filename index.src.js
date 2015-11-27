var tilebelt = require('tilebelt');
var _ = require('lodash');

mapboxgl.accessToken = 'pk.eyJ1IjoidGNxbCIsImEiOiJaSlZ6X3JZIn0.mPwXgf3BvAR4dPuBB3ypfA';

module.exports = function() {
  var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/tcql/cig9h1ohn000ca4m9ofyq77m7',
    //style: 'mapbox://styles/tcql/ciftz3vmh0015tgkpfyy0rn4l', //stylesheet location
    center: [-98.9, 39.06], // starting position
    zoom: 5 // starting zoom
  });
  window.map = map;

  map.on('style.load', function () {
    var currTile = [];
    var selectedWays = [];

    var selectedTileSource = new mapboxgl.GeoJSONSource({
      data: {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Point",
          "coordinates": [0,0]
        }
      }
    });
    map.addSource('selected-tile', selectedTileSource);
    map.addLayer({
        "id": "selected-tile",
        "type": "line",
        "source": "selected-tile",
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#d00",
            "line-width": 8
        }
    });


    map.on('mousemove', function (e) {
      var tile = tilebelt.pointToTile(e.lngLat.lng, e.lngLat.lat, 15);

      if (!tilebelt.tilesEqual(tile, currTile)) {
        currTile = tile.slice();
        tile = tilebelt.tileToGeoJSON(tile);
        selectedTileSource.setData(tile);
      }
    });


    map.on('click', function (e) {
      map.featuresAt(e.point, {radius: 5, layer: 'untagged-sidewalks'}, function (err, sidewalks) {
        if (err) throw err;

        var josmHtml = "<button id='open_in_josm'>Open in JOSM</button>" +
          "<hr />" +
          "<p>Note: JOSM Remote Control must "+
          "<a href='http://josm.openstreetmap.de/wiki/Help/Preferences/RemoteControl#PreferencesRemoteControl'>be enabled and have HTTPS support turned on</a><br /> "+
          "in order to Open in JOSM</p>"

        var idHtml = "<button id='open_in_id'>Open in iD</button><br />"

        var tooltip = new mapboxgl.Popup()
          .setLngLat(e.lngLat)

        if (sidewalks.length === 0) {

          getWaysInTile(map, currTile, function (err, ways) {
            if (err || ways.length === 0) return;

            var bounds = tilebelt.tileToBBOX(currTile);
            tooltip
              .setHTML("<p>This tile has "+ways.length+" unique footways to edit</p>" + josmHtml)
              .addTo(map);

            $("#open_in_josm").on('click', function () {
              openInJOSM(ways, bounds);
            });
          });
        } else {
          var ways = [sidewalks[0].properties._osm_way_id];
          var bounds = map.getBounds();
          bounds = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
          tooltip
            .setHTML("<pre>" + JSON.stringify(sidewalks[0].properties, null, 2) + "</pre>" + idHtml + josmHtml)
            .addTo(map);
          $("#open_in_josm").on('click', function () {
            openInJOSM(ways, bounds);
          });
          $("#open_in_id").on('click', function () {
            openInId(ways, bounds);
          });
        }
      });
    });
  });
};


function getWaysInTile(map, tile, callback) {
  var bbox = tilebelt.tileToBBOX(tile);
  var pxbbox = [map.project([bbox[0], bbox[1]]), map.project([bbox[2], bbox[3]])];

  // Note: layer filtering seems to not work, so we're manually filtering layers
  map.featuresIn(pxbbox, {layer: 'untagged-sidewalks'}, function (err, features) {
    if (err) return callback(err, null);

    var selectedFeatures = features.filter(function(elem) {
      return elem.layer.id === 'untagged-sidewalks'
    });
    var wayIds = selectedFeatures.map(function (elem) {
      return elem.properties._osm_way_id;
    });
    selectedWays = _.uniq(wayIds);

    callback(null, selectedWays);
  });
}

function openInJOSM(ways, bounds) {
  var left = bounds[0],
    bottom = bounds[1],
    right = bounds[2],
    top = bounds[3];
  var url = "https://127.0.0.1:8112/load_and_zoom?new_layer=true&left=" + left + "&right=" + right + "&top=" + top + "&bottom=" + bottom + "&select=";
  ways.forEach(function(id) {
    url += "way"+id+","
  });
  window.open(url);
}

function openInId(ways) {
  var ll = map.getCenter();
  var url = 'http://www.openstreetmap.org/edit?editor=id&lat='+ll.lat+'&lon='+ll.lng+'&zoom=18&way='+ways[0];
  window.open(url);
}
