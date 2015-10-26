(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.sidewalker = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
            
            var bbox = tilebelt.tileToBBOX(currTile);
            var pxbbox = [map.project([bbox[0], bbox[1]]), map.project([bbox[2], bbox[3]])];

            map.featuresIn(pxbbox, {layer: 'sidewalks-multiregion'}, function (err, selectedFeatures) {
              console.log(selectedFeatures.length)
              $("#selected-features-count").text(selectedFeatures.length);
              $("#selected-features-json").text(JSON.stringify(selectedFeatures, null, 2));
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
},{"tilebelt":2}],2:[function(require,module,exports){
// a tile is an array [x,y,z]
var d2r = Math.PI / 180,
    r2d = 180 / Math.PI;

function tileToBBOX (tile) {
    var e = tile2lon(tile[0]+1,tile[2]);
    var w = tile2lon(tile[0],tile[2]);    
    var s = tile2lat(tile[1]+1,tile[2]);
    var n = tile2lat(tile[1],tile[2]);
    return [w,s,e,n];
}

function tileToGeoJSON (tile) {
    var bbox = tileToBBOX(tile);
    var poly = {
        type: 'Polygon',
        coordinates: 
            [
                [
                    [bbox[0],bbox[1]],
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]]
                ]
            ]
    };
    return poly;
}

function tile2lon(x, z) {
    return (x/Math.pow(2,z)*360-180);
}

function tile2lat(y, z) {
    var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (r2d*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
}

function pointToTile(lon, lat, z) {
    var latr = lat*d2r,
        z2 = Math.pow(2, z);
    return [
        (Math.floor((lon+180)/360*z2)),
        (Math.floor((1-Math.log(Math.tan(latr) + 1/Math.cos(latr))/Math.PI)/2 *z2)),
        z
    ];
}

function getChildren (tile) {
    return [
        [tile[0]*2, tile[1]*2, tile[2]+1],
        [tile[0]*2+1, tile[1]*2, tile[2 ]+1],
        [tile[0]*2+1, tile[1]*2+1, tile[2]+1],
        [tile[0]*2, tile[1]*2+1, tile[2]+1],
    ];
}

function getParent (tile) {
    // top left
    if(tile[0]%2===0 && tile[1]%2===0) {
        return [tile[0]/2, tile[1]/2, tile[2]-1];
    }
    // bottom left
    else if((tile[0]%2===0) && (!tile[1]%2===0)) {
        return [tile[0]/2, (tile[1]-1)/2, tile[2]-1];
    }
    // top right
    else if((!tile[0]%2===0) && (tile[1]%2===0)) {
        return [(tile[0]-1)/2, (tile[1])/2, tile[2]-1];
    }
    // bottom right
    else {
        return [(tile[0]-1)/2, (tile[1]-1)/2, tile[2]-1];
    }
}

function getSiblings (tile) {
    return getChildren(getParent(tile));
}

function hasSiblings(tile, tiles) {
    var siblings = getSiblings(tile);
    for (var i = 0; i < siblings.length; i++) {
        if (!hasTile(tiles, siblings[i])) return false;
    }
    return true;
}

function hasTile(tiles, tile) {
    for (var i = 0; i < tiles.length; i++) {
        if (tilesEqual(tiles[i], tile)) return true;
    }
    return false;
}

function tilesEqual(tile1, tile2) {
    return (
        tile1[0] === tile2[0] &&
        tile1[1] === tile2[1] &&
        tile1[2] === tile2[2]
    );
}

function tileToQuadkey(tile) {
  var index = '';
  for (var z = tile[2]; z > 0; z--) {
      var b = 0;
      var mask = 1 << (z - 1);
      if ((tile[0] & mask) !== 0) b++;
      if ((tile[1] & mask) !== 0) b += 2;
      index += b.toString();
  }
  return index;
}

function quadkeyToTile(quadkey) {
    var x = 0;
    var y = 0;
    var z = quadkey.length;

    for (var i = z; i > 0; i--) {
        var mask = 1 << (i - 1);
        switch (quadkey[z - i]) {
            case '0':
                break;

            case '1':
                x |= mask;
                break;

            case '2':
                y |= mask;
                break;

            case '3':
                x |= mask;
                y |= mask;
                break;
        }
    }
    return [x,y,z];
}

function bboxToTile(bboxCoords) {
    var min = pointToTile(bboxCoords[0], bboxCoords[1], 32);
    var max = pointToTile(bboxCoords[2], bboxCoords[3], 32);
    var bbox = [min[0], min[1], max[0], max[1]];

    var z = getBboxZoom(bbox);
    if (z === 0) return [0,0,0];
    var x = bbox[0] >>> (32 - z);
    var y = bbox[1] >>> (32 - z);
    return [x,y,z];
}

function getBboxZoom(bbox) {
    var MAX_ZOOM = 28;
    for (var z = 0; z < MAX_ZOOM; z++) {
        var mask = 1 << (32 - (z + 1));
        if (((bbox[0] & mask) != (bbox[2] & mask)) ||
            ((bbox[1] & mask) != (bbox[3] & mask))) {
            return z;
        }
    }

    return MAX_ZOOM;
}

function pointToTileFraction (lon, lat, z) {
    var tile = pointToTile(lon, lat, z);
    var bbox = tileToBBOX(tile);

    var xTileOffset = bbox[2] - bbox[0];
    var xPointOffset = lon - bbox[0];
    var xPercentOffset = xPointOffset / xTileOffset;

    var yTileOffset = bbox[1] - bbox[3];
    var yPointOffset = lat - bbox[3];
    var yPercentOffset = yPointOffset / yTileOffset;

    return [tile[0]+xPercentOffset, tile[1]+yPercentOffset, z];
}

module.exports = {
    tileToGeoJSON: tileToGeoJSON,
    tileToBBOX: tileToBBOX,
    getChildren: getChildren,
    getParent: getParent,
    getSiblings: getSiblings,
    hasTile: hasTile,
    hasSiblings: hasSiblings,
    tilesEqual: tilesEqual,
    tileToQuadkey: tileToQuadkey,
    quadkeyToTile: quadkeyToTile,
    pointToTile: pointToTile,
    bboxToTile: bboxToTile,
    pointToTileFraction: pointToTileFraction
};

},{}]},{},[1])(1)
});