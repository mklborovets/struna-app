#pragma once
#include <array>
#include <atomic>
#include <cstddef>
#include "AudioTypes.hpp"

namespace struna {

struct YinDetectionResult {
    float frequencyHz;
    float confidence;
};

class YinDetector {
public:
    static constexpr std::size_t kMaxWindowSize = kDefaultAnalysisWindowSize;
    static constexpr std::size_t kMaxHalfWindowSize = kMaxWindowSize / 2;
    static constexpr float kDefaultThreshold = 0.12f;
    static constexpr float kMinDetectableFrequencyHz = 60.0f;
    static constexpr float kMaxDetectableFrequencyHz = 1200.0f;

    explicit YinDetector(
        float sampleRateHz = 48000.0f,
        float threshold = kDefaultThreshold) noexcept;

    void setSampleRate(float sampleRateHz) noexcept;
    float getSampleRate() const noexcept;

    void setThreshold(float threshold) noexcept;
    float getThreshold() const noexcept;

    YinDetectionResult detect(const float* samples, std::size_t sampleCount) noexcept;

private:
    void computeDifferenceFunction(
        const float* samples,
        std::size_t integrationWindow,
        std::size_t maxLag) noexcept;

    void computeCumulativeMeanNormalizedDifference(std::size_t maxLag) noexcept;

    std::size_t findAbsoluteThresholdLag(
        std::size_t minLag,
        std::size_t maxLag,
        float threshold) const noexcept;

    std::size_t refineSubharmonicLag(
        std::size_t candidateLag,
        std::size_t maxLag) const noexcept;

    float interpolateParabolicLag(
        std::size_t tauEstimate,
        std::size_t maxLag) const noexcept;

    std::atomic<float> sampleRateHz_;
    std::atomic<float> threshold_;
    std::array<double, kMaxHalfWindowSize + 1> difference_;
    std::array<float, kMaxHalfWindowSize + 1> cmndf_;
};

}
