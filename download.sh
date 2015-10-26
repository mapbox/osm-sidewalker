#!/bin/bash

mkdir -p data2
curl -o data/latest.planet.mbtiles.gz https://s3.amazonaws.com/mapbox/osm-qa-tiles/latest.planet.mbtiles.gz
cd data 
gunzip latest.planet.mbtiles