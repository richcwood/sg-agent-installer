#!/bin/bash

set -e

BUILD_SCRIPT_PATH=$1
BUILD_SCRIPT_NAME=$2

cd $BUILD_SCRIPT_PATH

# e.g. Release, Debug
BUILD=$3

node $BUILD_SCRIPT_NAME $BUILD

gzip ./build/$BUILD/*