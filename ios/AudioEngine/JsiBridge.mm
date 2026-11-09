#import <Foundation/Foundation.h>
#include <array>
#include <atomic>
#include <cstddef>
#include <cstdint>

#include "AudioTypes.hpp"
#include "PitchStabilizer.hpp"
#include "RingBuffer.hpp"
#include "RmsGate.hpp"
#include "YinDetector.hpp"

namespace {

class IosAudioEngineBridge {
public:
    static IosAudioEngineBridge& instance() noexcept {
        static IosAudioEngineBridge bridge;
        return bridge;
    }

    void pushSamples(const float* samples, std::size_t count) noexcept {
        ringBuffer_.pushOverwrite(samples, count);
    }

    void setSampleRate(float sampleRateHz) noexcept {
        if (sampleRateHz > 0.0f) {
            sampleRateHz_.store(sampleRateHz, std::memory_order_relaxed);
            yinDetector_.setSampleRate(sampleRateHz);
        }
    }

    void reset() noexcept {
        ringBuffer_.clear();
        stabilizer_.reset();
    }

    struna::PitchFrame pollPitchFrame() noexcept {
        std::array<float, struna::kDefaultAnalysisWindowSize> window{};
        if (!ringBuffer_.copyLatestWindow(window.data(), window.size())) {
            return {0.0f, 0.0f, struna::RmsGate::kSilenceFloorDb, false};
        }

        float rmsDb = struna::RmsGate::kSilenceFloorDb;
        const bool isAboveGate =
            rmsGate_.isAboveThreshold(window.data(), window.size(), rmsDb);
        if (!isAboveGate) {
            return stabilizer_.processFrame(0.0f, 0.0f, rmsDb, false, 33.0f);
        }

        const auto detection = yinDetector_.detect(window.data(), window.size());
        return stabilizer_.processFrame(
            detection.frequencyHz,
            detection.confidence,
            rmsDb,
            true,
            33.0f);
    }

private:
    IosAudioEngineBridge() noexcept
        : sampleRateHz_(48000.0f),
          rmsGate_(-52.0f),
          yinDetector_(48000.0f),
          stabilizer_(80.0f, 0.85f, 0.45f) {}

    std::atomic<float> sampleRateHz_;
    struna::RingBuffer<struna::kDefaultRingBufferCapacity> ringBuffer_;
    struna::RmsGate rmsGate_;
    struna::YinDetector yinDetector_;
    struna::PitchStabilizer stabilizer_;
};

}

extern "C" void StrunaIosPushAudioSamples(const float* samples, int32_t count) {
    if (samples == nullptr || count <= 0) {
        return;
    }
    IosAudioEngineBridge::instance().pushSamples(
        samples,
        static_cast<std::size_t>(count));
}

extern "C" void StrunaIosSetSampleRate(float sampleRateHz) {
    IosAudioEngineBridge::instance().setSampleRate(sampleRateHz);
}

extern "C" void StrunaIosResetEngine(void) {
    IosAudioEngineBridge::instance().reset();
}
