var tilebelt = require('tilebelt');

mapboxgl.accessToken = 'pk.eyJ1IjoidGNxbCIsImEiOiJaSlZ6X3JZIn0.mPwXgf3BvAR4dPuBB3ypfA';

module.exports = function() {
  var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/tcql/ciftz3vmh0015tgkpfyy0rn4l', //stylesheet location
    center: [-73.95706884246236, 40.77904734050378], // starting position
    zoom: 14 // starting zoom
  });


  map.on('style.load', function () {
    var currTile = [];
    var selectedTileSource = new mapboxgl.GeoJSONSource({
      data: {
         "type": "FeatureCollection",
         "features": []
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
        
        var bbox = tilebelt.tileToBBOX(currTile);
        var pxbbox = [map.project([bbox[0], bbox[1]]), map.project([bbox[2], bbox[3]])];

        map.featuresIn(pxbbox, {layer: 'sidewalks-multiregion'}, function (err, layers) {
          console.log(layers.length)
          $("#selected-features-count").text(selectedFeatures.length);
          $("#selected-features-json").text(JSON.stringify(layers, null, 2));
        });
      }
    });

    map.on('click', function (e) {
      map.featuresAt(e.point, {radius: 5, layer: 'sidewalks-multiregion'}, function (err, sidewalks) {
        if (err) throw err;
  
        if (sidewalks.length === 0) return;

        var way_id = sidewalks[0].properties._osm_way_id;
        var tooltip = new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML("<pre>"+JSON.stringify(sidewalks[0].properties, null, 2)+"</pre>" +
            "<button id='open_in_josm'>Open in JOSM</button>" + 
            "<hr />"+
            "<p>Note: JOSM Remote Control must <a href='http://josm.openstreetmap.de/wiki/Help/Preferences/RemoteControl#PreferencesRemoteControl'>be enabled and have HTTPS support turned on</a></p>"
          )
          .addTo(map);

        $("#open_in_josm").on('click', function () {
          var bounds = map.getBounds();
          console.log(way_id)
          openInJOSM(way_id, bounds.getWest(), bounds.getEast(), bounds.getNorth(), bounds.getSouth())
        });
      });
    });
  });
};


function openInJOSM(way_id, left, right, top, bottom) {
  var url = "https://127.0.0.1:8112/load_and_zoom?new_layer=true&left=" + left + "&right=" + right + "&top=" + top + "&bottom=" + bottom + "&select=way" + way_id;
  window.open(url);
}