#pragma once
#include <algorithm>
#include <cmath>
#include <cstddef>

namespace struna {

class RmsGate {
public:
    static constexpr float kSilenceFloorDb = -100.0f;
    static constexpr float kMinimumLinearAmplitude = 1.0e-5f;

    explicit RmsGate(float thresholdDb = -52.0f) noexcept
        : thresholdDb_(thresholdDb) {}

    void setThresholdDb(float thresholdDb) noexcept {
        thresholdDb_ = std::clamp(thresholdDb, kSilenceFloorDb, 0.0f);
    }

    float getThresholdDb() const noexcept {
        return thresholdDb_;
    }

    static float computeRmsDb(const float* samples, std::size_t count) noexcept {
        if (samples == nullptr || count == 0) {
            return kSilenceFloorDb;
        }

        double sumOfSquares = 0.0;
        for (std::size_t i = 0; i < count; ++i) {
            const double sample = static_cast<double>(samples[i]);
            sumOfSquares += sample * sample;
        }

        const float meanSquare = static_cast<float>(sumOfSquares / static_cast<double>(count));
        const float rmsAmplitude = std::sqrt(meanSquare);

        if (rmsAmplitude <= kMinimumLinearAmplitude) {
            return kSilenceFloorDb;
        }

        const float decibels = 20.0f * std::log10(rmsAmplitude);
        return std::max(decibels, kSilenceFloorDb);
    }

    bool isAboveThreshold(const float* samples, std::size_t count, float& outRmsDb) const noexcept {
        outRmsDb = computeRmsDb(samples, count);
        return outRmsDb >= thresholdDb_;
    }

private:
    float thresholdDb_;
};

}
