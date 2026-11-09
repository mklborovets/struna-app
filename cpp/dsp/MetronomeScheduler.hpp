#pragma once
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstddef>
#include <cstdint>

namespace struna {

class MetronomeScheduler {
public:
    static constexpr float kMinBpm = 30.0f;
    static constexpr float kMaxBpm = 280.0f;
    static constexpr float kDefaultBpm = 120.0f;
    static constexpr float kDownbeatFrequencyHz = 1320.0f;
    static constexpr float kSubbeatFrequencyHz = 880.0f;
    static constexpr float kClickDurationSeconds = 0.025f;
    static constexpr float kTwoPi = 6.28318530717958647692f;
    static constexpr std::uint32_t kBeatsPerBar = 4;

    explicit MetronomeScheduler(float sampleRateHz = 48000.0f) noexcept
        : sampleRateHz_(sampleRateHz),
          bpm_(kDefaultBpm),
          isActive_(false),
          sampleCursorInBeat_(0),
          currentBeatIndex_(0) {}

    void setSampleRate(float sampleRateHz) noexcept {
        if (sampleRateHz > 0.0f) {
            sampleRateHz_ = sampleRateHz;
        }
    }

    void setBpm(float bpm) noexcept {
        const float clamped = std::clamp(bpm, kMinBpm, kMaxBpm);
        bpm_.store(clamped, std::memory_order_relaxed);
    }

    float getBpm() const noexcept {
        return bpm_.load(std::memory_order_relaxed);
    }

    void setActive(bool active) noexcept {
        const bool previouslyActive = isActive_.exchange(active, std::memory_order_acq_rel);
        if (active && !previouslyActive) {
            sampleCursorInBeat_ = 0;
            currentBeatIndex_ = 0;
        }
    }

    bool isActive() const noexcept {
        return isActive_.load(std::memory_order_acquire);
    }

    std::uint32_t getCurrentBeatIndex() const noexcept {
        return currentBeatIndex_;
    }

    std::size_t getSamplesPerBeat() const noexcept {
        const float currentBpm = bpm_.load(std::memory_order_relaxed);
        return static_cast<std::size_t>((sampleRateHz_ * 60.0f) / currentBpm);
    }

    void renderBlock(float* outputSamples, std::size_t frameCount) noexcept {
        if (outputSamples == nullptr || frameCount == 0) {
            return;
        }

        if (!isActive_.load(std::memory_order_acquire)) {
            std::fill(outputSamples, outputSamples + frameCount, 0.0f);
            return;
        }

        const std::size_t samplesPerBeat = std::max<std::size_t>(1, getSamplesPerBeat());
        const std::size_t clickLengthSamples =
            static_cast<std::size_t>(sampleRateHz_ * kClickDurationSeconds);

        for (std::size_t i = 0; i < frameCount; ++i) {
            if (sampleCursorInBeat_ >= samplesPerBeat) {
                sampleCursorInBeat_ = 0;
                currentBeatIndex_ = (currentBeatIndex_ + 1) % kBeatsPerBar;
            }

            if (sampleCursorInBeat_ < clickLengthSamples) {
                const float toneHz = (currentBeatIndex_ == 0)
                    ? kDownbeatFrequencyHz
                    : kSubbeatFrequencyHz;
                const float timeSec =
                    static_cast<float>(sampleCursorInBeat_) / sampleRateHz_;
                const float envelope =
                    std::exp(-timeSec * 140.0f);
                outputSamples[i] = 0.8f * envelope * std::sin(kTwoPi * toneHz * timeSec);
            } else {
                outputSamples[i] = 0.0f;
            }

            ++sampleCursorInBeat_;
        }
    }

private:
    float sampleRateHz_;
    std::atomic<float> bpm_;
    std::atomic<bool> isActive_;
    std::size_t sampleCursorInBeat_;
    std::uint32_t currentBeatIndex_;
};

}
