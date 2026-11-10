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
    static constexpr float kClickDurationSeconds = 0.045f;
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
            sampleRateHz_.store(sampleRateHz, std::memory_order_relaxed);
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
            sampleCursorInBeat_.store(0, std::memory_order_release);
            currentBeatIndex_.store(0, std::memory_order_release);
        }
    }

    bool isActive() const noexcept {
        return isActive_.load(std::memory_order_acquire);
    }

    std::uint32_t getCurrentBeatIndex() const noexcept {
        return currentBeatIndex_.load(std::memory_order_relaxed);
    }

    std::size_t getSamplesPerBeat() const noexcept {
        const float currentBpm = bpm_.load(std::memory_order_relaxed);
        const float currentSampleRateHz = sampleRateHz_.load(std::memory_order_relaxed);
        return static_cast<std::size_t>((currentSampleRateHz * 60.0f) / currentBpm);
    }

    void renderBlock(float* outputSamples, std::size_t frameCount) noexcept {
        if (outputSamples == nullptr || frameCount == 0) {
            return;
        }

        if (!isActive_.load(std::memory_order_acquire)) {
            std::fill(outputSamples, outputSamples + frameCount, 0.0f);
            return;
        }

        const float currentSampleRateHz = sampleRateHz_.load(std::memory_order_relaxed);
        const std::size_t samplesPerBeat = std::max<std::size_t>(1, getSamplesPerBeat());
        const std::size_t clickLengthSamples =
            static_cast<std::size_t>(currentSampleRateHz * kClickDurationSeconds);

        std::size_t cursor = sampleCursorInBeat_.load(std::memory_order_acquire);
        std::uint32_t beatIndex = currentBeatIndex_.load(std::memory_order_acquire);

        for (std::size_t i = 0; i < frameCount; ++i) {
            if (cursor >= samplesPerBeat) {
                cursor = 0;
                beatIndex = (beatIndex + 1) % kBeatsPerBar;
            }

            if (cursor < clickLengthSamples) {
                const float toneHz = (beatIndex == 0)
                    ? kDownbeatFrequencyHz
                    : kSubbeatFrequencyHz;
                const float timeSec =
                    static_cast<float>(cursor) / currentSampleRateHz;
                const float envelope =
                    std::exp(-timeSec * 65.0f);
                const float phase = kTwoPi * toneHz * timeSec;
                const float waveform =
                    0.75f * std::sin(phase) + 0.25f * std::sin(2.0f * phase);
                outputSamples[i] = 0.95f * envelope * waveform;
            } else {
                outputSamples[i] = 0.0f;
            }

            ++cursor;
        }

        sampleCursorInBeat_.store(cursor, std::memory_order_release);
        currentBeatIndex_.store(beatIndex, std::memory_order_release);
    }

private:
    std::atomic<float> sampleRateHz_;
    std::atomic<float> bpm_;
    std::atomic<bool> isActive_;
    std::atomic<std::size_t> sampleCursorInBeat_;
    std::atomic<std::uint32_t> currentBeatIndex_;
};

}
