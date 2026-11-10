#pragma once
#if __has_include(<jsi/jsi.h>)
#include <jsi/jsi.h>
#elif __has_include("../../node_modules/react-native/ReactCommon/jsi/jsi/jsi.h")
#include "../../node_modules/react-native/ReactCommon/jsi/jsi/jsi.h"
#endif
#include <atomic>
#include <chrono>
#include <cstddef>
#include <functional>
#include <memory>
#include <mutex>
#include <vector>

#if __has_include("AudioTypes.hpp")
#include "AudioTypes.hpp"
#include "MetronomeScheduler.hpp"
#include "PitchStabilizer.hpp"
#include "RingBuffer.hpp"
#include "RmsGate.hpp"
#include "SpectrumAnalyzer.hpp"
#include "YinDetector.hpp"
#else
#include "../dsp/AudioTypes.hpp"
#include "../dsp/MetronomeScheduler.hpp"
#include "../dsp/PitchStabilizer.hpp"
#include "../dsp/RingBuffer.hpp"
#include "../dsp/RmsGate.hpp"
#include "../dsp/SpectrumAnalyzer.hpp"
#include "../dsp/YinDetector.hpp"
#endif

namespace struna {

class StrunaHostObject : public facebook::jsi::HostObject {
public:
    using StartCaptureCallback = std::function<bool()>;
    using StopCaptureCallback = std::function<void()>;

    explicit StrunaHostObject(
        StartCaptureCallback onStartCapture = nullptr,
        StopCaptureCallback onStopCapture = nullptr) noexcept;

    ~StrunaHostObject() override = default;

    void setCaptureCallbacks(
        StartCaptureCallback onStartCapture,
        StopCaptureCallback onStopCapture) noexcept;

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
    void copySpectrumSnapshotNative(float* targetBuffer, std::size_t length) noexcept;
    void renderMetronomeAudioBlock(float* outputBuffer, std::size_t frameCount) noexcept;

    void setNoiseGateThresholdDb(float decibels) noexcept;
    void setMetronomeBpm(float bpm) noexcept;
    void setMetronomeActive(bool active) noexcept;
    float getMetronomeBpm() const noexcept;
    bool isMetronomeActive() const noexcept;

    void setDemoMode(bool enabled, float frequencyHz = 110.0f) noexcept;
    bool isDemoModeActive() const noexcept;

    static void install(
        facebook::jsi::Runtime& runtime,
        const std::shared_ptr<StrunaHostObject>& hostObject);

private:
    float measureElapsedFrameMs() noexcept;
    void synthesizeDemoSamplesLocked(std::size_t sampleCount) noexcept;

    mutable std::mutex dspMutex_;
    StartCaptureCallback onStartCapture_;
    StopCaptureCallback onStopCapture_;
    std::atomic<bool> isCapturing_;
    std::atomic<float> sampleRateHz_;
    std::chrono::steady_clock::time_point lastPollTimestamp_;
    bool hasPollTimestamp_;

    RingBuffer<kDefaultRingBufferCapacity> ringBuffer_;
    RmsGate rmsGate_;
    YinDetector yinDetector_;
    PitchStabilizer stabilizer_;
    SpectrumAnalyzer<> spectrumAnalyzer_;
    MetronomeScheduler metronomeScheduler_;
    std::atomic<bool> isDemoMode_{false};
    std::atomic<float> demoFrequencyHz_{110.0f};
    float demoPhase_{0.0f};
};

}
