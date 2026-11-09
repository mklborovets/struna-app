#pragma once
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace struna::testing {

class SyntheticSignalGenerator {
public:
    static constexpr double kTwoPi = 6.283185307179586476925286766559;

    static std::vector<float> generatePureSine(
        float frequencyHz,
        float sampleRateHz,
        std::size_t sampleCount,
        float amplitude = 0.8f) {
        std::vector<float> signal(sampleCount, 0.0f);
        const double angularStep =
            kTwoPi * static_cast<double>(frequencyHz) / static_cast<double>(sampleRateHz);
        for (std::size_t i = 0; i < sampleCount; ++i) {
            signal[i] = static_cast<float>(
                static_cast<double>(amplitude) * std::sin(angularStep * static_cast<double>(i)));
        }
        return signal;
    }

    static std::vector<float> generateHarmonicRichTone(
        float fundamentalHz,
        float sampleRateHz,
        std::size_t sampleCount,
        float fundamentalAmplitude,
        float secondHarmonicAmplitude,
        float thirdHarmonicAmplitude) {
        std::vector<float> signal(sampleCount, 0.0f);
        const double w0 =
            kTwoPi * static_cast<double>(fundamentalHz) / static_cast<double>(sampleRateHz);
        for (std::size_t i = 0; i < sampleCount; ++i) {
            const double t = static_cast<double>(i);
            const double val =
                static_cast<double>(fundamentalAmplitude) * std::sin(w0 * t) +
                static_cast<double>(secondHarmonicAmplitude) * std::sin(2.0 * w0 * t) +
                static_cast<double>(thirdHarmonicAmplitude) * std::sin(3.0 * w0 * t);
            signal[i] = static_cast<float>(val);
        }
        return signal;
    }

    static std::vector<float> generateDeterministicWhiteNoise(
        std::size_t sampleCount,
        float amplitude = 0.5f,
        std::uint32_t seed = 1337u) {
        std::vector<float> signal(sampleCount, 0.0f);
        std::uint32_t state = seed;
        for (std::size_t i = 0; i < sampleCount; ++i) {
            state = state * 1664525u + 1013904223u;
            const float normalized =
                (static_cast<float>(state & 0x00FFFFFFu) / static_cast<float>(0x00800000u)) - 1.0f;
            signal[i] = normalized * amplitude;
        }
        return signal;
    }

    static float computeCentsError(float measuredHz, float referenceHz) noexcept {
        if (measuredHz <= 0.0f || referenceHz <= 0.0f) {
            return 1200.0f;
        }
        return 1200.0f * std::log2(measuredHz / referenceHz);
    }
};

}
