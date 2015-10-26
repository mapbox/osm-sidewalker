var tilereduce = require('tile-reduce'),
  argv = require('minimist')(process.argv.slice(2));

var area = JSON.parse(argv.area);

 var opts = {
  zoom: 15,
  tileLayers: [
      {
        name: 'osm',
        mbtiles: __dirname+'/data/latest.planet.mbtiles',
        layers: ['osm']
      }
    ],
  map: __dirname + '/sidewalker.js'
};


tilereduce(area, opts)
.on('start', function () {
})
.on('reduce', function (result) {
  result.forEach(function (elem) {
    console.log(JSON.stringify(elem));
  });
})
.on('error', function (error) {
  throw error;
}).run();