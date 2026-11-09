#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "AudioTypes.hpp"
#include "RingBuffer.hpp"
#include "RmsGate.hpp"
#include "SyntheticSignalGenerator.hpp"

namespace {

constexpr float kTestSampleRateHz = 48000.0f;
constexpr std::size_t kTestWindowSize = 2048;

void requireTrue(bool condition, const char* description) {
    if (!condition) {
        std::cerr << "[FAIL] " << description << std::endl;
        std::exit(EXIT_FAILURE);
    }
}

void requireNear(float actual, float expected, float tolerance, const char* description) {
    if (std::fabs(actual - expected) > tolerance) {
        std::cerr << "[FAIL] " << description << " (expected " << expected
                  << " +/- " << tolerance << ", got " << actual << ")" << std::endl;
        std::exit(EXIT_FAILURE);
    }
}

void testRingBufferAndRmsGate() {
    struna::RingBuffer<8192> ringBuffer;
    std::vector<float> inputSamples(4096, 0.0f);
    for (std::size_t i = 0; i < inputSamples.size(); ++i) {
        inputSamples[i] = static_cast<float>(i) * 0.0001f;
    }

    const std::size_t written = ringBuffer.write(inputSamples.data(), inputSamples.size());
    requireTrue(written == 4096, "RingBuffer must write all 4096 floats");
    requireTrue(ringBuffer.availableToRead() == 4096, "RingBuffer must report 4096 available floats");

    std::vector<float> outputSamples(4096, 0.0f);
    const std::size_t readCount = ringBuffer.read(outputSamples.data(), outputSamples.size());
    requireTrue(readCount == 4096, "RingBuffer must read all 4096 floats");

    for (std::size_t i = 0; i < 4096; ++i) {
        requireNear(outputSamples[i], inputSamples[i], 1.0e-7f, "RingBuffer sample integrity");
    }

    std::vector<float> silenceBuffer(1024, 0.0f);
    const float silenceRmsDb =
        struna::RmsGate::computeRmsDb(silenceBuffer.data(), silenceBuffer.size());
    requireNear(silenceRmsDb, -100.0f, 0.001f, "RmsGate must return -100 dB on array of zeros");

    struna::RmsGate gate(-50.0f);
    float measuredDb = 0.0f;
    requireTrue(
        !gate.isAboveThreshold(silenceBuffer.data(), silenceBuffer.size(), measuredDb),
        "RmsGate must block silent frame");
}

void testSyntheticSignalGenerator() {
    const auto sine440 = struna::testing::SyntheticSignalGenerator::generatePureSine(
        440.0f, kTestSampleRateHz, kTestWindowSize, 0.8f);
    requireTrue(sine440.size() == kTestWindowSize, "Generated signal size must match requested size");

    const float rmsDb = struna::RmsGate::computeRmsDb(sine440.data(), sine440.size());
    requireTrue(rmsDb > -6.0f && rmsDb < -4.0f, "440 Hz sine wave with 0.8 amplitude has valid RMS");

    std::size_t zeroCrossings = 0;
    for (std::size_t i = 1; i < sine440.size(); ++i) {
        if (sine440[i - 1] <= 0.0f && sine440[i] > 0.0f) {
            ++zeroCrossings;
        }
    }
    requireTrue(zeroCrossings >= 18 && zeroCrossings <= 19, "440 Hz sine wave has expected period count in 2048 samples");
}

}

int main(int argc, char** argv) {
    std::string suite = "all";
    for (int i = 1; i < argc; ++i) {
        const std::string arg(argv[i]);
        const std::string prefix = "--suite=";
        if (arg.rfind(prefix, 0) == 0) {
            suite = arg.substr(prefix.size());
        }
    }

    if (suite == "all" || suite == "ring_rms") {
        testRingBufferAndRmsGate();
    }
    if (suite == "all" || suite == "generator") {
        testSyntheticSignalGenerator();
    }

    std::cout << "[PASS] Suite '" << suite << "' completed successfully." << std::endl;
    return EXIT_SUCCESS;
}
