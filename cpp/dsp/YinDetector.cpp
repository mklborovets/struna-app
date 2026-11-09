#include "YinDetector.hpp"
#include <algorithm>
#include <cmath>

namespace struna {

YinDetector::YinDetector(float sampleRateHz, float threshold) noexcept
    : sampleRateHz_(sampleRateHz), threshold_(threshold) {
    difference_.fill(0.0);
    cmndf_.fill(1.0f);
}

void YinDetector::setSampleRate(float sampleRateHz) noexcept {
    if (sampleRateHz > 0.0f) {
        sampleRateHz_ = sampleRateHz;
    }
}

float YinDetector::getSampleRate() const noexcept {
    return sampleRateHz_;
}

void YinDetector::setThreshold(float threshold) noexcept {
    threshold_ = std::clamp(threshold, 0.01f, 0.50f);
}

float YinDetector::getThreshold() const noexcept {
    return threshold_;
}

YinDetectionResult YinDetector::detect(const float* samples, std::size_t sampleCount) noexcept {
    if (samples == nullptr || sampleCount < 128) {
        return {0.0f, 0.0f};
    }

    const std::size_t clampedCount = std::min(sampleCount, kMaxWindowSize);
    const std::size_t integrationWindow = clampedCount / 2;
    const std::size_t minLag = std::max<std::size_t>(
        2, static_cast<std::size_t>(sampleRateHz_ / kMaxDetectableFrequencyHz));
    const std::size_t maxLag = std::min<std::size_t>(
        integrationWindow,
        static_cast<std::size_t>(sampleRateHz_ / kMinDetectableFrequencyHz));

    if (minLag >= maxLag) {
        return {0.0f, 0.0f};
    }

    computeDifferenceFunction(samples, integrationWindow, maxLag);
    computeCumulativeMeanNormalizedDifference(maxLag);

    std::size_t tauEstimate = findAbsoluteThresholdLag(minLag, maxLag);
    if (tauEstimate == 0) {
        return {0.0f, 0.0f};
    }

    tauEstimate = refineSubharmonicLag(tauEstimate, maxLag);

    const float aperiodicity = std::clamp(cmndf_[tauEstimate], 0.0f, 1.0f);
    const float confidence = 1.0f - aperiodicity;

    const float interpolatedLag = interpolateParabolicLag(tauEstimate, maxLag);
    if (interpolatedLag <= 0.0f) {
        return {0.0f, 0.0f};
    }

    const float frequencyHz = sampleRateHz_ / interpolatedLag;
    return {frequencyHz, confidence};
}

void YinDetector::computeDifferenceFunction(
    const float* samples,
    std::size_t integrationWindow,
    std::size_t maxLag) noexcept {
    difference_[0] = 0.0;
    for (std::size_t tau = 1; tau <= maxLag; ++tau) {
        double sumSquaredDiff = 0.0;
        for (std::size_t j = 0; j < integrationWindow; ++j) {
            const double delta =
                static_cast<double>(samples[j]) - static_cast<double>(samples[j + tau]);
            sumSquaredDiff += delta * delta;
        }
        difference_[tau] = sumSquaredDiff;
    }
}

void YinDetector::computeCumulativeMeanNormalizedDifference(std::size_t maxLag) noexcept {
    cmndf_[0] = 1.0f;
    double runningSum = 0.0;
    for (std::size_t tau = 1; tau <= maxLag; ++tau) {
        runningSum += difference_[tau];
        if (runningSum <= 1.0e-15) {
            cmndf_[tau] = 1.0f;
        } else {
            const double normalized =
                difference_[tau] * static_cast<double>(tau) / runningSum;
            cmndf_[tau] = static_cast<float>(normalized);
        }
    }
}

std::size_t YinDetector::findAbsoluteThresholdLag(
    std::size_t minLag,
    std::size_t maxLag) const noexcept {
    for (std::size_t tau = minLag; tau <= maxLag; ++tau) {
        if (cmndf_[tau] < threshold_) {
            while (tau + 1 <= maxLag && cmndf_[tau + 1] < cmndf_[tau]) {
                ++tau;
            }
            return tau;
        }
    }

    std::size_t globalMinLag = minLag;
    float globalMinValue = cmndf_[minLag];
    for (std::size_t tau = minLag + 1; tau <= maxLag; ++tau) {
        if (cmndf_[tau] < globalMinValue) {
            globalMinValue = cmndf_[tau];
            globalMinLag = tau;
        }
    }

    if (globalMinValue >= 0.65f) {
        return 0;
    }
    return globalMinLag;
}

std::size_t YinDetector::refineSubharmonicLag(
    std::size_t candidateLag,
    std::size_t maxLag) const noexcept {
    constexpr float kPureFundamentalFloor = 0.015f;
    constexpr float kSubharmonicImprovementRatio = 0.45f;

    std::size_t bestLag = candidateLag;
    float bestCmndf = cmndf_[candidateLag];

    if (bestCmndf <= kPureFundamentalFloor) {
        return bestLag;
    }

    for (std::size_t multiplier = 2; multiplier <= 3; ++multiplier) {
        const std::size_t targetLag = candidateLag * multiplier;
        if (targetLag >= maxLag) {
            break;
        }

        const std::size_t windowRadius = std::max<std::size_t>(2, candidateLag / 16);
        const std::size_t searchStart =
            targetLag > windowRadius ? targetLag - windowRadius : targetLag;
        const std::size_t searchEnd = std::min(maxLag, targetLag + windowRadius);

        std::size_t localMinLag = searchStart;
        float localMinVal = cmndf_[searchStart];
        for (std::size_t tau = searchStart + 1; tau <= searchEnd; ++tau) {
            if (cmndf_[tau] < localMinVal) {
                localMinVal = cmndf_[tau];
                localMinLag = tau;
            }
        }

        if (localMinVal < bestCmndf * kSubharmonicImprovementRatio) {
            bestCmndf = localMinVal;
            bestLag = localMinLag;
            if (bestCmndf <= kPureFundamentalFloor) {
                break;
            }
        }
    }

    return bestLag;
}

float YinDetector::interpolateParabolicLag(
    std::size_t tauEstimate,
    std::size_t maxLag) const noexcept {
    if (tauEstimate < 1 || tauEstimate >= maxLag) {
        return static_cast<float>(tauEstimate);
    }

    const double y0 = difference_[tauEstimate - 1];
    const double y1 = difference_[tauEstimate];
    const double y2 = difference_[tauEstimate + 1];

    const double denominator = 2.0 * (2.0 * y1 - y0 - y2);
    if (std::fabs(denominator) <= 1.0e-15) {
        return static_cast<float>(tauEstimate);
    }

    const double offset = (y2 - y0) / denominator;
    const double clampedOffset = std::clamp(offset, -1.0, 1.0);
    return static_cast<float>(static_cast<double>(tauEstimate) + clampedOffset);
}

}
