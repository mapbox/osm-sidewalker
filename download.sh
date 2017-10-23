#!/bin/bash
mkdir -p data
curl -o data/latest.planet.mbtiles.gz https://s3.amazonaws.com/mapbox/osm-qa-tiles-production/latest.planet.mbtiles.gz
cd data 
gunzip latest.planet.mbtiles
