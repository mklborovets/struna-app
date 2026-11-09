cmake_minimum_required(VERSION 3.16)
project(StrunaDspTests LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

enable_testing()

add_executable(
    struna_dsp_tests
    YinDetectorTests.cpp
)

target_include_directories(
    struna_dsp_tests
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../dsp
)

if(MSVC)
    target_compile_options(struna_dsp_tests PRIVATE /W4)
else()
    target_compile_options(struna_dsp_tests PRIVATE -Wall -Wextra -Wpedantic -O2)
endif()

add_test(NAME RingBufferAndRmsGateTests COMMAND struna_dsp_tests --suite=ring_rms)
add_test(NAME SyntheticSineGenerator440HzTest COMMAND struna_dsp_tests --suite=generator)
add_test(NAME AutocorrelationOctaveErrorBenchmark COMMAND struna_dsp_tests --suite=autocorr)
