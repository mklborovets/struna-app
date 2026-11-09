cmake_minimum_required(VERSION 3.22.1)
project(struna LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(STRUNA_ROOT_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../)

add_library(
    struna
    SHARED
    JniBridge.cpp
    ${STRUNA_ROOT_DIR}/cpp/jsi/StrunaHostObject.cpp
    ${STRUNA_ROOT_DIR}/cpp/dsp/YinDetector.cpp
    ${STRUNA_ROOT_DIR}/cpp/dsp/PitchStabilizer.cpp
)

target_include_directories(
    struna
    PRIVATE
    ${STRUNA_ROOT_DIR}/cpp/dsp
    ${STRUNA_ROOT_DIR}/cpp/jsi
    ${STRUNA_ROOT_DIR}/node_modules/react-native/ReactCommon/jsi
)

target_compile_options(
    struna
    PRIVATE
    -Wall
    -Wextra
    -O3
    -ffast-math
)

find_library(LOG_LIB log)
target_link_libraries(struna ${LOG_LIB})
