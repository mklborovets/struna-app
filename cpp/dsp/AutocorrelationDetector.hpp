#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include "AudioTypes.hpp"

namespace struna {

template <std::size_t MaxWindowSize = kDefaultAnalysisWindowSize>
class AutocorrelationDetector {
public:
    static constexpr float kMinFrequencyHz = 60.0f;
    static constexpr float kMaxFrequencyHz = 1200.0f;

    explicit AutocorrelationDetector(float sampleRateHz = 48000.0f) noexcept
        : sampleRateHz_(sampleRateHz) {
        correlation_.fill(0.0f);
    }

    void setSampleRate(float sampleRateHz) noexcept {
        if (sampleRateHz > 0.0f) {
            sampleRateHz_ = sampleRateHz;
        }
    }

    float detectFrequency(const float* samples, std::size_t sampleCount) noexcept {
        if (samples == nullptr || sampleCount < 64) {
            return 0.0f;
        }

        const std::size_t windowSize = std::min(sampleCount, MaxWindowSize);
        const std::size_t minLag = std::max<std::size_t>(
            2, static_cast<std::size_t>(sampleRateHz_ / kMaxFrequencyHz));
        const std::size_t maxLag = std::min<std::size_t>(
            windowSize / 2, static_cast<std::size_t>(sampleRateHz_ / kMinFrequencyHz));

        if (minLag >= maxLag) {
            return 0.0f;
        }

        for (std::size_t lag = 0; lag <= maxLag; ++lag) {
            double sum = 0.0;
            const std::size_t limit = windowSize - lag;
            for (std::size_t i = 0; i < limit; ++i) {
                sum += static_cast<double>(samples[i]) * static_cast<double>(samples[i + lag]);
            }
            correlation_[lag] = static_cast<float>(sum);
        }

        if (correlation_[0] <= 1.0e-7f) {
            return 0.0f;
        }

        std::size_t searchStart = minLag;
        while (searchStart < maxLag && correlation_[searchStart] > correlation_[searchStart + 1]) {
            ++searchStart;
        }

        std::size_t bestLag = searchStart;
        float maxPeak = correlation_[searchStart];
        for (std::size_t lag = searchStart + 1; lag <= maxLag; ++lag) {
            if (correlation_[lag] > maxPeak) {
                maxPeak = correlation_[lag];
                bestLag = lag;
            }
        }

        if (bestLag <= minLag || bestLag >= maxLag) {
            return bestLag > 0 ? (sampleRateHz_ / static_cast<float>(bestLag)) : 0.0f;
        }

        const float prev = correlation_[bestLag - 1];
        const float curr = correlation_[bestLag];
        const float next = correlation_[bestLag + 1];
        const float denominator = 2.0f * (2.0f * curr - prev - next);
        float refinedLag = static_cast<float>(bestLag);
        if (std::fabs(denominator) > 1.0e-9f) {
            refinedLag += (next - prev) / denominator;
        }

        return refinedLag > 0.0f ? (sampleRateHz_ / refinedLag) : 0.0f;
    }

private:
    float sampleRateHz_;
    std::array<float, MaxWindowSize> correlation_;
};

}
