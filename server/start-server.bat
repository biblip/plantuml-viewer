@echo off
setlocal

#set PLANT_UML_JAR=plantuml-mit-1.2025.2.jar
set PLANT_UML_JAR=plantuml-1.2026.2.jar

REM Set the port for the PlantUML server
set PLANTUML_PORT=9090

REM Navigate to the directory containing the PlantUML JAR file
cd /d %~dp0

REM Display the command being executed
echo Running command: java -jar %PLANT_UML_JAR% -tsvg -picoweb:%PLANTUML_PORT%

REM Start the PlantUML server
java -jar %PLANT_UML_JAR% -tsvg -picoweb:%PLANTUML_PORT%

endlocal
