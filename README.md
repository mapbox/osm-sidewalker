# osm-sidewalker

A [Tile Reduce](https://github.com/mapbox/tile-reduce) processor for detecting potentially untagged sidewalks in OpenStreetMap


## installation

```
npm install 
```

## downloading osm qa tiles

OSM QA tiles are very large (38 GB compressed, 49 GB expanded). On OSX & Linux systems, you can
run the build process by executing `./download.sh`.

On Windows, or if you wish to download QA tiles yourself:

- Create a `data` folder inside your copy of this repository
- [Download OSM QA tiles](https://s3.amazonaws.com/mapbox/osm-qa-tiles/latest.planet.mbtiles.gz)
- Use `gunzip` or any other archiving tool that can expand .gz files to expand OSM QA tiles
- Move the expanded `latest.planet.mbtiles` to the `data` folder

## running

When executing the Tile Reduce task, you must provide a bounding box to select tiles. For example:

```
node index.js --area=[-77.12,38.79,-76.9,39] > output.json
```

## publishing

The output of the Tile Reduce job is a line-separated list of sidewalk linestrings. This format works well with [tippecanoe](https://github.com/mapbox/tippecanoe), for example:

```
tippecanoe -f -o sidewalks.mbtiles output.json
```

The resulting mbtiles can be uploaded as a Mapbox data source [online](https://www.mapbox.com/uploads/?source=data), or via command line using [mapbox-upload](https://github.com/mapbox/mapbox-upload)

