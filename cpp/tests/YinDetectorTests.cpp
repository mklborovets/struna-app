#include <chrono>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "AudioTypes.hpp"
#include "AutocorrelationDetector.hpp"
#include "MetronomeScheduler.hpp"
#include "PitchStabilizer.hpp"
#include "RingBuffer.hpp"
#include "RmsGate.hpp"
#include "SpectrumAnalyzer.hpp"
#include "SyntheticSignalGenerator.hpp"
#include "YinDetector.hpp"

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

    struna::YinDetector detector(kTestSampleRateHz);
    const auto result = detector.detect(sine440.data(), sine440.size());
    const float centsError =
        struna::testing::SyntheticSignalGenerator::computeCentsError(result.frequencyHz, 440.0f);
    requireTrue(std::fabs(centsError) <= 0.5f, "440 Hz sine wave detected within 0.5 cents");
}

void testAutocorrelationOctaveErrorBenchmark() {
    struna::AutocorrelationDetector<kTestWindowSize> autocorrDetector(kTestSampleRateHz);

    const auto pureLowE = struna::testing::SyntheticSignalGenerator::generatePureSine(
        82.41f, kTestSampleRateHz, kTestWindowSize, 0.8f);
    const float pureDetectedHz =
        autocorrDetector.detectFrequency(pureLowE.data(), pureLowE.size());
    const float pureCentsError =
        struna::testing::SyntheticSignalGenerator::computeCentsError(pureDetectedHz, 82.41f);
    requireTrue(
        std::fabs(pureCentsError) < 2.0f,
        "Autocorrelation detects pure 82.41 Hz sine accurately");

    const auto dominantSecondHarmonicE =
        struna::testing::SyntheticSignalGenerator::generateHarmonicRichTone(
            82.41f, kTestSampleRateHz, kTestWindowSize, 0.18f, 1.0f, 0.0f);
    const float harmonicDetectedHz = autocorrDetector.detectFrequency(
        dominantSecondHarmonicE.data(), dominantSecondHarmonicE.size());
    const float octaveErrorCents =
        struna::testing::SyntheticSignalGenerator::computeCentsError(
            harmonicDetectedHz, 164.82f);
    requireTrue(
        std::fabs(octaveErrorCents) < 15.0f,
        "Standard autocorrelation exhibits expected octave error (164.82 Hz instead of 82.41 Hz)");
}

void testYinDetectorGuitarStringsPrecision() {
    struna::YinDetector detector(kTestSampleRateHz);
    const std::vector<float> standardGuitarFrequencies = {
        82.41f, 110.00f, 146.83f, 196.00f, 246.94f, 329.63f, 440.00f};

    for (float expectedHz : standardGuitarFrequencies) {
        const auto signal = struna::testing::SyntheticSignalGenerator::generatePureSine(
            expectedHz, kTestSampleRateHz, kTestWindowSize, 0.85f);
        const auto result = detector.detect(signal.data(), signal.size());
        const float centsError =
            struna::testing::SyntheticSignalGenerator::computeCentsError(
                result.frequencyHz, expectedHz);

        requireTrue(
            std::fabs(centsError) <= 0.5f,
            "YIN detector must achieve +/- 0.5 cent accuracy across all guitar strings");
        requireTrue(
            result.confidence >= 0.95f,
            "YIN detector confidence on pure sine must exceed 0.95");
    }
}

void testYinDetectorHarmonicImmunity() {
    struna::YinDetector detector(kTestSampleRateHz);
    const std::vector<float> guitarStrings = {
        82.41f, 110.00f, 146.83f, 196.00f, 246.94f, 329.63f};

    for (float fundamentalHz : guitarStrings) {
        const auto harmonicSignal =
            struna::testing::SyntheticSignalGenerator::generateHarmonicRichTone(
                fundamentalHz, kTestSampleRateHz, kTestWindowSize, 0.25f, 1.0f, 0.75f);

        const auto result = detector.detect(harmonicSignal.data(), harmonicSignal.size());
        const float centsError =
            struna::testing::SyntheticSignalGenerator::computeCentsError(
                result.frequencyHz, fundamentalHz);

        requireTrue(
            std::fabs(centsError) <= 0.5f,
            "YIN detector must lock onto fundamental f0 despite stronger 2nd and 3rd harmonics");
    }
}

void testPitchStabilizerAttackAndMedian() {
    struna::PitchStabilizer stabilizer(80.0f, 0.85f, 0.45f);

    const auto attackFrame1 = stabilizer.processFrame(195.0f, 0.92f, -20.0f, true, 30.0f);
    requireTrue(
        !attackFrame1.isLocked && attackFrame1.frequencyHz == 0.0f,
        "First 30ms of transient attack must be suppressed");

    const auto attackFrame2 = stabilizer.processFrame(140.0f, 0.90f, -20.0f, true, 30.0f);
    requireTrue(
        !attackFrame2.isLocked && attackFrame2.frequencyHz == 0.0f,
        "60ms of transient attack must be suppressed");

    const auto postAttack1 = stabilizer.processFrame(82.41f, 0.98f, -18.0f, true, 30.0f);
    requireNear(postAttack1.frequencyHz, 82.41f, 0.01f, "At 90ms stabilizer outputs valid pitch");

    stabilizer.processFrame(82.41f, 0.98f, -18.0f, true, 30.0f);
    const auto lockedFrame = stabilizer.processFrame(82.41f, 0.98f, -18.0f, true, 30.0f);
    requireTrue(lockedFrame.isLocked, "After 3 valid frames stabilizer locks pitch");
    requireNear(lockedFrame.frequencyHz, 82.41f, 0.01f, "Locked pitch matches 82.41 Hz");

    const auto outlierFrame = stabilizer.processFrame(164.82f, 0.95f, -18.0f, true, 30.0f);
    requireNear(
        outlierFrame.frequencyHz,
        82.41f,
        0.01f,
        "Single frame octave jump (164.82 Hz among 82.41 Hz) must be rejected");
}

void testSpectrumAndMetronome() {
    struna::SpectrumAnalyzer<> analyzer;
    const auto sine440 = struna::testing::SyntheticSignalGenerator::generatePureSine(
        440.0f, kTestSampleRateHz, 512, 0.8f);
    struna::SpectrumFrame spectrumFrame{};
    analyzer.computeFrame(sine440.data(), sine440.size(), spectrumFrame);

    float maxMag = 0.0f;
    for (float mag : spectrumFrame.magnitudes) {
        if (mag > maxMag) {
            maxMag = mag;
        }
    }
    requireTrue(maxMag > 0.5f, "SpectrumAnalyzer produces non-zero magnitude peak for 440 Hz tone");

    struna::MetronomeScheduler metronome(kTestSampleRateHz);
    metronome.setBpm(120.0f);
    metronome.setActive(true);
    requireTrue(
        metronome.getSamplesPerBeat() == 24000,
        "At 48000 Hz and 120 BPM each beat is exactly 24000 samples");

    std::vector<float> audioBlock(24000, 0.0f);
    metronome.renderBlock(audioBlock.data(), audioBlock.size());
    requireTrue(
        std::fabs(audioBlock[10]) > 0.01f,
        "Metronome generates click waveform at start of beat");
    requireNear(
        audioBlock[20000],
        0.0f,
        1.0e-6f,
        "Metronome is silent after click envelope completes");
}

void testYinSubCentDetuneAndSampleRates() {
    const std::vector<float> sampleRates = {44100.0f, 48000.0f};
    const std::vector<float> detuneOffsetsCents = {-23.4f, -4.2f, 0.0f, +3.5f, +17.8f};

    for (float sampleRate : sampleRates) {
        struna::YinDetector detector(sampleRate);
        for (float detuneCents : detuneOffsetsCents) {
            const float targetHz =
                110.0f * std::pow(2.0f, detuneCents / 1200.0f);
            const auto signal =
                struna::testing::SyntheticSignalGenerator::generatePureSine(
                    targetHz, sampleRate, kTestWindowSize, 0.85f);
            const auto result = detector.detect(signal.data(), signal.size());
            const float measuredCents =
                struna::testing::SyntheticSignalGenerator::computeCentsError(
                    result.frequencyHz, 110.0f);
            requireNear(
                measuredCents,
                detuneCents,
                0.5f,
                "YIN must track fractional detunes within +/- 0.5 cents at both 44.1kHz and 48kHz");
        }
    }
}

void testYinTwentyConsecutiveGuitarTrialsZeroOctaveErrors() {
    struna::YinDetector detector(kTestSampleRateHz);
    const std::vector<float> guitarStrings = {
        82.41f, 110.00f, 146.83f, 196.00f, 246.94f, 329.63f};

    for (std::size_t trial = 0; trial < 20; ++trial) {
        const float fundamentalHz = guitarStrings[trial % guitarStrings.size()];
        const float firstAmp = 0.22f + 0.02f * static_cast<float>(trial % 4);
        const float secondAmp = 0.90f + 0.05f * static_cast<float>(trial % 3);
        const float thirdAmp = 0.65f + 0.04f * static_cast<float>(trial % 5);

        auto signal =
            struna::testing::SyntheticSignalGenerator::generateHarmonicRichTone(
                fundamentalHz,
                kTestSampleRateHz,
                kTestWindowSize,
                firstAmp,
                secondAmp,
                thirdAmp);

        const auto hum50Hz =
            struna::testing::SyntheticSignalGenerator::generatePureSine(
                50.0f, kTestSampleRateHz, kTestWindowSize, 0.015f);
        const auto roomNoise =
            struna::testing::SyntheticSignalGenerator::generateDeterministicWhiteNoise(
                kTestWindowSize, 0.01f, static_cast<std::uint32_t>(1000 + trial));

        for (std::size_t i = 0; i < kTestWindowSize; ++i) {
            signal[i] += hum50Hz[i] + roomNoise[i];
        }

        const auto detection = detector.detect(signal.data(), signal.size());
        const float centsError =
            struna::testing::SyntheticSignalGenerator::computeCentsError(
                detection.frequencyHz, fundamentalHz);

        requireTrue(
            std::fabs(centsError) <= 1.0f,
            "Zero octave errors and +/- 1 cent accuracy across 20 consecutive realistic guitar trials");
    }
}

void testYinRealtimeLatencyBudget() {
    struna::YinDetector detector(kTestSampleRateHz);
    struna::PitchStabilizer stabilizer(80.0f, 0.85f, 0.45f);
    const auto signal =
        struna::testing::SyntheticSignalGenerator::generateHarmonicRichTone(
            82.41f, kTestSampleRateHz, kTestWindowSize, 0.3f, 0.9f, 0.6f);

    const auto startClock = std::chrono::steady_clock::now();
    constexpr std::size_t kIterations = 50;
    for (std::size_t i = 0; i < kIterations; ++i) {
        const auto res = detector.detect(signal.data(), signal.size());
        (void)stabilizer.processFrame(res.frequencyHz, res.confidence, -18.0f, true, 10.6f);
    }
    const auto endClock = std::chrono::steady_clock::now();
    const double totalMs =
        std::chrono::duration<double, std::milli>(endClock - startClock).count();
    const double avgFrameMs = totalMs / static_cast<double>(kIterations);

    requireTrue(
        avgFrameMs < 10.0,
        "YIN + PitchStabilizer processing time per frame must stay well under 10 ms budget");
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
    if (suite == "all" || suite == "autocorr") {
        testAutocorrelationOctaveErrorBenchmark();
    }
    if (suite == "all" || suite == "yin_precision") {
        testYinDetectorGuitarStringsPrecision();
    }
    if (suite == "all" || suite == "yin_harmonics") {
        testYinDetectorHarmonicImmunity();
    }
    if (suite == "all" || suite == "stabilizer") {
        testPitchStabilizerAttackAndMedian();
    }
    if (suite == "all" || suite == "extras") {
        testSpectrumAndMetronome();
    }
    if (suite == "all" || suite == "yin_detune_sr") {
        testYinSubCentDetuneAndSampleRates();
    }
    if (suite == "all" || suite == "yin_20_trials") {
        testYinTwentyConsecutiveGuitarTrialsZeroOctaveErrors();
    }
    if (suite == "all" || suite == "latency") {
        testYinRealtimeLatencyBudget();
    }

    std::cout << "[PASS] Suite '" << suite << "' completed successfully." << std::endl;
    return EXIT_SUCCESS;
}
