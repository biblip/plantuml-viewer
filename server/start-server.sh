#!/bin/sh

# PlantUML JAR file
# PLANT_UML_JAR="plantuml-mit-1.2025.2.jar"
PLANT_UML_JAR="plantuml-1.2026.6.jar"

# Set the port for the PlantUML server
PLANTUML_PORT=9090

# Navigate to the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Display the command being executed
echo "Running command: java -jar $PLANT_UML_JAR -tsvg -picoweb:$PLANTUML_PORT"

# Start the PlantUML server
java -jar "$PLANT_UML_JAR" -tsvg -picoweb:$PLANTUML_PORT
