#include "PitchStabilizer.hpp"
#include <algorithm>
#include <cmath>

namespace struna {

PitchStabilizer::PitchStabilizer(
    float attackSuppressionMs,
    float confidenceThreshold,
    float smoothingFactor) noexcept
    : attackSuppressionMs_(attackSuppressionMs),
      confidenceThreshold_(confidenceThreshold),
      smoothingFactor_(smoothingFactor),
      activeSignalDurationMs_(0.0f),
      smoothedFrequencyHz_(0.0f),
      windowCount_(0),
      windowWriteIndex_(0),
      consecutiveOutlierCount_(0) {
    medianWindow_.fill(0.0f);
}

void PitchStabilizer::reset() noexcept {
    activeSignalDurationMs_ = 0.0f;
    smoothedFrequencyHz_ = 0.0f;
    windowCount_ = 0;
    windowWriteIndex_ = 0;
    consecutiveOutlierCount_ = 0;
    medianWindow_.fill(0.0f);
}

void PitchStabilizer::setAttackSuppressionMs(float durationMs) noexcept {
    attackSuppressionMs_ = std::max(0.0f, durationMs);
}

void PitchStabilizer::setConfidenceThreshold(float threshold) noexcept {
    confidenceThreshold_ = std::clamp(threshold, 0.1f, 0.99f);
}

PitchFrame PitchStabilizer::processFrame(
    float rawFrequencyHz,
    float confidence,
    float rmsDb,
    bool isAboveNoiseGate,
    float frameDurationMs) noexcept {
    if (!isAboveNoiseGate) {
        reset();
        return {0.0f, 0.0f, rmsDb, false};
    }

    activeSignalDurationMs_ += std::max(0.0f, frameDurationMs);
    if (activeSignalDurationMs_ < attackSuppressionMs_) {
        return {0.0f, confidence, rmsDb, false};
    }

    if (rawFrequencyHz <= 0.0f || confidence < confidenceThreshold_) {
        return {smoothedFrequencyHz_, confidence, rmsDb, false};
    }

    if (windowCount_ >= 3 && smoothedFrequencyHz_ > 0.0f &&
        isOctaveOutlier(rawFrequencyHz, smoothedFrequencyHz_)) {
        ++consecutiveOutlierCount_;
        if (consecutiveOutlierCount_ < 3) {
            return {smoothedFrequencyHz_, confidence, rmsDb, true};
        }
    } else {
        consecutiveOutlierCount_ = 0;
    }

    medianWindow_[windowWriteIndex_] = rawFrequencyHz;
    windowWriteIndex_ = (windowWriteIndex_ + 1) % kMedianWindowSize;
    if (windowCount_ < kMedianWindowSize) {
        ++windowCount_;
    }

    const float medianFrequency = computeMedian();
    if (smoothedFrequencyHz_ <= 0.0f) {
        smoothedFrequencyHz_ = medianFrequency;
    } else {
        const float relativeDiff =
            std::fabs(medianFrequency - smoothedFrequencyHz_) / smoothedFrequencyHz_;
        if (relativeDiff > 0.08f) {
            smoothedFrequencyHz_ = medianFrequency;
        } else {
            smoothedFrequencyHz_ +=
                smoothingFactor_ * (medianFrequency - smoothedFrequencyHz_);
        }
    }

    const bool isLocked = windowCount_ >= 3 && confidence >= confidenceThreshold_;
    return {smoothedFrequencyHz_, confidence, rmsDb, isLocked};
}

float PitchStabilizer::computeMedian() const noexcept {
    if (windowCount_ == 0) {
        return 0.0f;
    }

    std::array<float, kMedianWindowSize> sorted{};
    for (std::size_t i = 0; i < windowCount_; ++i) {
        sorted[i] = medianWindow_[i];
    }
    std::sort(sorted.begin(), sorted.begin() + windowCount_);

    const std::size_t mid = windowCount_ / 2;
    if (windowCount_ % 2 == 1) {
        return sorted[mid];
    }
    return 0.5f * (sorted[mid - 1] + sorted[mid]);
}

bool PitchStabilizer::isOctaveOutlier(float candidateHz, float referenceHz) const noexcept {
    if (candidateHz <= 0.0f || referenceHz <= 0.0f) {
        return false;
    }
    const float ratio = candidateHz > referenceHz
        ? (candidateHz / referenceHz)
        : (referenceHz / candidateHz);
    return (ratio >= 1.90f && ratio <= 2.10f) || (ratio >= 2.85f && ratio <= 3.15f);
}

}
