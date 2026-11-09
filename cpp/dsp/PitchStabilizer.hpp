#pragma once
#include <array>
#include <cstddef>
#include "AudioTypes.hpp"

namespace struna {

class PitchStabilizer {
public:
    static constexpr std::size_t kMedianWindowSize = 5;
    static constexpr float kDefaultAttackSuppressionMs = 80.0f;
    static constexpr float kDefaultConfidenceThreshold = 0.85f;
    static constexpr float kDefaultSmoothingFactor = 0.45f;

    explicit PitchStabilizer(
        float attackSuppressionMs = kDefaultAttackSuppressionMs,
        float confidenceThreshold = kDefaultConfidenceThreshold,
        float smoothingFactor = kDefaultSmoothingFactor) noexcept;

    void reset() noexcept;

    void setAttackSuppressionMs(float durationMs) noexcept;
    void setConfidenceThreshold(float threshold) noexcept;

    PitchFrame processFrame(
        float rawFrequencyHz,
        float confidence,
        float rmsDb,
        bool isAboveNoiseGate,
        float frameDurationMs) noexcept;

private:
    float computeMedian() const noexcept;
    bool isOctaveOutlier(float candidateHz, float referenceHz) const noexcept;

    float attackSuppressionMs_;
    float confidenceThreshold_;
    float smoothingFactor_;

    float activeSignalDurationMs_;
    float smoothedFrequencyHz_;
    std::size_t windowCount_;
    std::size_t windowWriteIndex_;
    std::size_t consecutiveOutlierCount_;
    std::array<float, kMedianWindowSize> medianWindow_;
};

}
