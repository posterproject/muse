#!/usr/bin/env bash

# Parse command line arguments
usage() {
    echo "Usage: $0 [-p <project-directory>] [-d <docker-directory>]"
    echo "  -p, --project-dir    Project directory (default: derived from current directory)"
    echo "  -d, --docker-dir     Docker configuration directory (default: docker/<project-directory>)"
    echo "Example: $0 -p webgl-test -d docker/webgl-test"
    exit 1
}

# Default values
PROJECT_DIR=""
DOCKER_DIR=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project-dir)
            PROJECT_DIR="$2"
            shift 2
            ;;
        -d|--docker-dir)
            DOCKER_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# If project directory is not provided, try to derive it from current directory
if [ -z "$PROJECT_DIR" ]; then
    PROJECT_DIR=$(basename "$(pwd)")
fi

# If docker directory is not provided, use the default path
if [ -z "$DOCKER_DIR" ]; then
    DOCKER_DIR="$(dirname "$0")/$PROJECT_DIR"
fi

# Check if docker directory exists
if [ ! -d "$DOCKER_DIR" ]; then
    echo "Error: Docker configuration directory not found: $DOCKER_DIR"
    exit 1
fi

# Build the Docker image
docker build \
    -t "$PROJECT_DIR" \
    -f "$DOCKER_DIR/Dockerfile" \
    --build-arg PROJECT_DIR="$PROJECT_DIR" \
    --build-arg DOCKER_DIR="$DOCKER_DIR" \
    . 