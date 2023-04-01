#!/bin/bash

set -e

BUILD_SCRIPT_PATH=$1

cd $BUILD_SCRIPT_PATH

# e.g. Release, Debug
BUILD=$2

node ./BuildInstaller.js $BUILD

gzip ./build/$BUILD/*