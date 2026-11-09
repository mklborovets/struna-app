#pragma once
#include <jsi/jsi.h>
#include <atomic>
#include <cstddef>
#include <functional>
#include <memory>
#include <vector>

#include "AudioTypes.hpp"
#include "MetronomeScheduler.hpp"
#include "PitchStabilizer.hpp"
#include "RingBuffer.hpp"
#include "RmsGate.hpp"
#include "YinDetector.hpp"

namespace struna {

class StrunaHostObject : public facebook::jsi::HostObject {
public:
    using StartCaptureCallback = std::function<bool()>;
    using StopCaptureCallback = std::function<void()>;

    explicit StrunaHostObject(
        StartCaptureCallback onStartCapture = nullptr,
        StopCaptureCallback onStopCapture = nullptr) noexcept;

    ~StrunaHostObject() override = default;

    facebook::jsi::Value get(
        facebook::jsi::Runtime& runtime,
        const facebook::jsi::PropNameID& name) override;

    std::vector<facebook::jsi::PropNameID> getPropertyNames(
        facebook::jsi::Runtime& runtime) override;

    void pushAudioSamples(const float* samples, std::size_t count) noexcept;
    void setSampleRate(float sampleRateHz) noexcept;
    void resetEngine() noexcept;

    PitchFrame pollPitchFrameNative() noexcept;
    void copyWaveformSnapshotNative(float* targetBuffer, std::size_t length) const noexcept;
    void renderMetronomeAudioBlock(float* outputBuffer, std::size_t frameCount) noexcept;

    void setNoiseGateThresholdDb(float decibels) noexcept;
    void setMetronomeBpm(float bpm) noexcept;
    void setMetronomeActive(bool active) noexcept;
    float getMetronomeBpm() const noexcept;
    bool isMetronomeActive() const noexcept;

    static void install(
        facebook::jsi::Runtime& runtime,
        const std::shared_ptr<StrunaHostObject>& hostObject);

private:
    StartCaptureCallback onStartCapture_;
    StopCaptureCallback onStopCapture_;
    std::atomic<bool> isCapturing_;
    std::atomic<float> sampleRateHz_;

    RingBuffer<kDefaultRingBufferCapacity> ringBuffer_;
    RmsGate rmsGate_;
    YinDetector yinDetector_;
    PitchStabilizer stabilizer_;
    MetronomeScheduler metronomeScheduler_;
};

}
