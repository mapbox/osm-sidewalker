var tilereduce = require('tile-reduce'),
  path = require('path');

 var opts = {
  zoom: 12,
  sourceCover: 'osm',
  sources: [
      {
        name: 'osm',
        mbtiles: path.join(__dirname, '../../../data/latest.planet-z12.mbtiles'),
        layers: ['osm']
      }
    ],
  map: __dirname + '/sidewalker.js'
};


tilereduce(opts)
.on('error', function (error) {
  throw error;
})
