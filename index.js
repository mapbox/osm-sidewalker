var tilereduce = require('tile-reduce'),
  argv = require('minimist')(process.argv.slice(2));

var area = JSON.parse(argv.area);

 var opts = {
  zoom: 15,
  bbox: area,
  sources: [
      {
        name: 'osm',
        mbtiles: __dirname+'/data/latest.planet.mbtiles',
        //layers: ['osm']
      }
    ],
  map: __dirname + '/sidewalker.js'
};


tilereduce(opts)
.on('error', function (error) {
  throw error;
})