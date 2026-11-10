#include "StrunaHostObject.hpp"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <string>   // IWYU pragma: keep
#include <utility>  // IWYU pragma: keep

namespace struna {

namespace {

struct TypedArraySlice {
    float* data;
    std::size_t floatCount;
};

TypedArraySlice extractFloat32Slice(
    facebook::jsi::Runtime& rt,
    const facebook::jsi::Value* args,
    std::size_t count) {
    if (count < 1 || !args[0].isObject()) {
        return {nullptr, 0};
    }
    facebook::jsi::Object typedArray = args[0].asObject(rt);
    if (!typedArray.hasProperty(rt, "buffer")) {
        return {nullptr, 0};
    }
    facebook::jsi::Value bufferVal = typedArray.getProperty(rt, "buffer");
    if (!bufferVal.isObject()) {
        return {nullptr, 0};
    }
    facebook::jsi::Object bufferObj = bufferVal.asObject(rt);
    if (!bufferObj.isArrayBuffer(rt)) {
        return {nullptr, 0};
    }
    facebook::jsi::ArrayBuffer arrayBuffer = bufferObj.getArrayBuffer(rt);
    const std::size_t totalByteSize = arrayBuffer.size(rt);

    std::size_t byteOffset = 0;
    if (typedArray.hasProperty(rt, "byteOffset")) {
        facebook::jsi::Value offsetVal = typedArray.getProperty(rt, "byteOffset");
        if (offsetVal.isNumber() && offsetVal.asNumber() >= 0.0) {
            byteOffset = static_cast<std::size_t>(offsetVal.asNumber());
        }
    }
    if (byteOffset >= totalByteSize || (byteOffset % sizeof(float)) != 0) {
        return {nullptr, 0};
    }

    std::size_t byteLength = totalByteSize - byteOffset;
    if (typedArray.hasProperty(rt, "byteLength")) {
        facebook::jsi::Value lengthVal = typedArray.getProperty(rt, "byteLength");
        if (lengthVal.isNumber() && lengthVal.asNumber() >= 0.0) {
            const auto requestedBytes = static_cast<std::size_t>(lengthVal.asNumber());
            if (requestedBytes <= totalByteSize - byteOffset) {
                byteLength = requestedBytes;
            }
        }
    }

    const std::size_t floatCount = byteLength / sizeof(float);
    if (floatCount == 0) {
        return {nullptr, 0};
    }

    auto* rawBytes = reinterpret_cast<std::uint8_t*>(arrayBuffer.data(rt));
    auto* floatPtr = reinterpret_cast<float*>(rawBytes + byteOffset);
    return {floatPtr, floatCount};
}

}

StrunaHostObject::StrunaHostObject(
    StartCaptureCallback onStartCapture,
    StopCaptureCallback onStopCapture) noexcept
    : onStartCapture_(std::move(onStartCapture)),
      onStopCapture_(std::move(onStopCapture)),
      isCapturing_(false),
      sampleRateHz_(48000.0f),
      lastPollTimestamp_(std::chrono::steady_clock::now()),
      hasPollTimestamp_(false),
      rmsGate_(-58.0f),
      yinDetector_(48000.0f),
      stabilizer_(60.0f, 0.78f, 0.38f, 650.0f),
      spectrumAnalyzer_(),
      metronomeScheduler_(48000.0f) {}

void StrunaHostObject::setCaptureCallbacks(
    StartCaptureCallback onStartCapture,
    StopCaptureCallback onStopCapture) noexcept {
    std::lock_guard<std::mutex> lock(dspMutex_);
    onStartCapture_ = std::move(onStartCapture);
    onStopCapture_ = std::move(onStopCapture);
}

void StrunaHostObject::pushAudioSamples(const float* samples, std::size_t count) noexcept {
    if (isDemoMode_.load(std::memory_order_relaxed)) {
        return;
    }
    ringBuffer_.pushOverwrite(samples, count);
}

void StrunaHostObject::setSampleRate(float sampleRateHz) noexcept {
    if (sampleRateHz > 0.0f) {
        sampleRateHz_.store(sampleRateHz, std::memory_order_relaxed);
        yinDetector_.setSampleRate(sampleRateHz);
        metronomeScheduler_.setSampleRate(sampleRateHz);
    }
}

void StrunaHostObject::resetEngine() noexcept {
    std::lock_guard<std::mutex> lock(dspMutex_);
    if (isDemoMode_.load(std::memory_order_relaxed)) {
        return;
    }
    ringBuffer_.clear();
    stabilizer_.reset();
    hasPollTimestamp_ = false;
}

void StrunaHostObject::synthesizeDemoSamplesLocked(std::size_t sampleCount) noexcept {
    const float freq = demoFrequencyHz_.load(std::memory_order_relaxed);
    const float sampleRate = sampleRateHz_.load(std::memory_order_relaxed);
    if (freq <= 0.0f || sampleRate <= 0.0f || sampleCount == 0) {
        return;
    }

    constexpr float kTwoPi = 6.28318530717958647692f;
    const float phaseInc = (kTwoPi * freq) / sampleRate;
    constexpr std::size_t kChunkCapacity = 512;
    std::array<float, kChunkCapacity> chunk{};

    std::size_t remaining = sampleCount;
    while (remaining > 0) {
        const std::size_t stepCount = std::min(remaining, kChunkCapacity);
        for (std::size_t i = 0; i < stepCount; ++i) {
            const float p = demoPhase_;
            chunk[i] =
                0.66f * std::sin(p) +
                0.18f * std::sin(2.0f * p) +
                0.06f * std::sin(3.0f * p);
            demoPhase_ += phaseInc;
            if (demoPhase_ >= kTwoPi) {
                demoPhase_ -= kTwoPi;
            }
        }
        ringBuffer_.pushOverwrite(chunk.data(), stepCount);
        remaining -= stepCount;
    }
}

float StrunaHostObject::measureElapsedFrameMs() noexcept {
    const auto now = std::chrono::steady_clock::now();
    if (!hasPollTimestamp_) {
        lastPollTimestamp_ = now;
        hasPollTimestamp_ = true;
        return 33.0f;
    }
    const float elapsedMs = std::chrono::duration<float, std::milli>(
        now - lastPollTimestamp_).count();
    lastPollTimestamp_ = now;
    return std::clamp(elapsedMs, 5.0f, 100.0f);
}

PitchFrame StrunaHostObject::pollPitchFrameNative() noexcept {
    std::lock_guard<std::mutex> lock(dspMutex_);
    const float frameDurationMs = measureElapsedFrameMs();

    if (isDemoMode_.load(std::memory_order_relaxed)) {
        const float sampleRate = sampleRateHz_.load(std::memory_order_relaxed);
        const auto advanceSamples = std::clamp<std::size_t>(
            static_cast<std::size_t>((sampleRate * frameDurationMs) / 1000.0f),
            256,
            1536);
        synthesizeDemoSamplesLocked(advanceSamples);
    }

    std::array<float, kDefaultAnalysisWindowSize> window{};
    if (!ringBuffer_.copyLatestWindow(window.data(), window.size())) {
        return {0.0f, 0.0f, RmsGate::kSilenceFloorDb, false};
    }

    float rmsDb = RmsGate::kSilenceFloorDb;
    const bool aboveGate = rmsGate_.isAboveThreshold(window.data(), window.size(), rmsDb);
    if (!aboveGate) {
        return stabilizer_.processFrame(0.0f, 0.0f, rmsDb, false, frameDurationMs);
    }

    const auto detection = yinDetector_.detect(window.data(), window.size());
    return stabilizer_.processFrame(
        detection.frequencyHz,
        detection.confidence,
        rmsDb,
        true,
        frameDurationMs);
}

void StrunaHostObject::copyWaveformSnapshotNative(
    float* targetBuffer,
    std::size_t length) const noexcept {
    if (targetBuffer == nullptr || length == 0) {
        return;
    }

    std::array<float, kDefaultAnalysisWindowSize> window{};
    if (!ringBuffer_.copyLatestWindow(window.data(), window.size())) {
        std::fill(targetBuffer, targetBuffer + length, 0.0f);
        return;
    }

    constexpr std::size_t kSearchLimit = kDefaultAnalysisWindowSize / 2;
    constexpr std::size_t kDisplaySpan = 768;

    float maxAbs = 0.0f;
    for (std::size_t i = 0; i < kSearchLimit; ++i) {
        const float a = std::fabs(window[i]);
        if (a > maxAbs) {
            maxAbs = a;
        }
    }

    if (maxAbs < 1.0e-4f) {
        std::fill(targetBuffer, targetBuffer + length, 0.0f);
        return;
    }

    float triggerStart = 0.0f;
    for (std::size_t idx = 16; idx < kSearchLimit; ++idx) {
        if (window[idx] <= 0.0f && window[idx + 1] > 0.0f) {
            float minBefore = 0.0f;
            for (std::size_t b = idx - 16; b <= idx; ++b) {
                if (window[b] < minBefore) {
                    minBefore = window[b];
                }
            }
            float maxAfter = 0.0f;
            const std::size_t lookaheadEnd = std::min<std::size_t>(idx + 96, window.size() - 1);
            for (std::size_t f = idx + 1; f <= lookaheadEnd; ++f) {
                if (window[f] > maxAfter) {
                    maxAfter = window[f];
                }
            }
            if (minBefore < -0.15f * maxAbs && maxAfter > 0.35f * maxAbs) {
                const float denom = window[idx + 1] - window[idx];
                const float frac = denom > 1.0e-6f ? (-window[idx] / denom) : 0.0f;
                triggerStart = static_cast<float>(idx) + std::clamp(frac, 0.0f, 1.0f);
                break;
            }
        }
    }

    const float step = static_cast<float>(kDisplaySpan) / static_cast<float>(length);
    for (std::size_t i = 0; i < length; ++i) {
        const float exactPos = triggerStart + static_cast<float>(i) * step;
        const auto baseIdx = std::min<std::size_t>(
            static_cast<std::size_t>(exactPos),
            window.size() - 2);
        const float frac = exactPos - static_cast<float>(baseIdx);
        const float interpolated =
            window[baseIdx] + frac * (window[baseIdx + 1] - window[baseIdx]);
        targetBuffer[i] = std::clamp(interpolated, -1.0f, 1.0f);
    }
}

void StrunaHostObject::copySpectrumSnapshotNative(
    float* targetBuffer,
    std::size_t length) noexcept {
    if (targetBuffer == nullptr || length == 0) {
        return;
    }

    std::lock_guard<std::mutex> lock(dspMutex_);
    std::array<float, kDefaultAnalysisWindowSize> window{};
    if (!ringBuffer_.copyLatestWindow(window.data(), window.size())) {
        std::fill(targetBuffer, targetBuffer + length, 0.0f);
        return;
    }

    SpectrumFrame frame{};
    spectrumAnalyzer_.computeFrame(window.data(), window.size(), frame);
    const std::size_t copyCount = std::min(length, frame.magnitudes.size());
    for (std::size_t i = 0; i < copyCount; ++i) {
        targetBuffer[i] = frame.magnitudes[i];
    }
    for (std::size_t i = copyCount; i < length; ++i) {
        targetBuffer[i] = 0.0f;
    }
}

void StrunaHostObject::renderMetronomeAudioBlock(
    float* outputBuffer,
    std::size_t frameCount) noexcept {
    metronomeScheduler_.renderBlock(outputBuffer, frameCount);
}

void StrunaHostObject::setNoiseGateThresholdDb(float decibels) noexcept {
    std::lock_guard<std::mutex> lock(dspMutex_);
    rmsGate_.setThresholdDb(decibels);
}

void StrunaHostObject::setMetronomeBpm(float bpm) noexcept {
    metronomeScheduler_.setBpm(bpm);
}

void StrunaHostObject::setMetronomeActive(bool active) noexcept {
    metronomeScheduler_.setActive(active);
}

float StrunaHostObject::getMetronomeBpm() const noexcept {
    return metronomeScheduler_.getBpm();
}

bool StrunaHostObject::isMetronomeActive() const noexcept {
    return metronomeScheduler_.isActive();
}

void StrunaHostObject::setDemoMode(bool enabled, float frequencyHz) noexcept {
    std::lock_guard<std::mutex> lock(dspMutex_);
    const float validFreq = frequencyHz > 0.0f ? frequencyHz : 110.0f;
    demoFrequencyHz_.store(validFreq, std::memory_order_relaxed);
    isDemoMode_.store(enabled, std::memory_order_relaxed);
    demoPhase_ = 0.0f;
    ringBuffer_.clear();
    stabilizer_.reset();

    if (enabled) {
        synthesizeDemoSamplesLocked(kDefaultAnalysisWindowSize * 2);
        std::array<float, kDefaultAnalysisWindowSize> window{};
        if (ringBuffer_.copyLatestWindow(window.data(), window.size())) {
            float rmsDb = RmsGate::kSilenceFloorDb;
            const bool aboveGate = rmsGate_.isAboveThreshold(window.data(), window.size(), rmsDb);
            if (aboveGate) {
                const auto detection = yinDetector_.detect(window.data(), window.size());
                for (int i = 0; i < 4; ++i) {
                    (void)stabilizer_.processFrame(
                        detection.frequencyHz,
                        detection.confidence,
                        rmsDb,
                        true,
                        35.0f);
                }
            }
        }
    }
}

bool StrunaHostObject::isDemoModeActive() const noexcept {
    return isDemoMode_.load(std::memory_order_relaxed);
}

std::vector<facebook::jsi::PropNameID> StrunaHostObject::getPropertyNames(
    facebook::jsi::Runtime& runtime) {
    return facebook::jsi::PropNameID::names(
        runtime,
        "startAudioCapture",
        "stopAudioCapture",
        "pollPitchFrame",
        "getWaveformSnapshot",
        "getSpectrumSnapshot",
        "setNoiseGateThresholdDb",
        "setMetronomeBpm",
        "setMetronomeActive",
        "setDemoMode",
        "isDemoModeActive");
}

facebook::jsi::Value StrunaHostObject::get(
    facebook::jsi::Runtime& runtime,
    const facebook::jsi::PropNameID& name) {
    const std::string propName = name.utf8(runtime);

    if (propName == "startAudioCapture") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            0,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value*,
                std::size_t) -> facebook::jsi::Value {
                StartCaptureCallback startCb;
                {
                    std::lock_guard<std::mutex> lock(dspMutex_);
                    startCb = onStartCapture_;
                }
                bool started = true;
                if (startCb) {
                    started = startCb();
                }
                isCapturing_.store(started, std::memory_order_release);
                return facebook::jsi::Value(started);
            });
    }

    if (propName == "stopAudioCapture") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            0,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value*,
                std::size_t) -> facebook::jsi::Value {
                isCapturing_.store(false, std::memory_order_release);
                StopCaptureCallback stopCb;
                {
                    std::lock_guard<std::mutex> lock(dspMutex_);
                    stopCb = onStopCapture_;
                }
                if (stopCb) {
                    stopCb();
                }
                resetEngine();
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "pollPitchFrame") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            0,
            [this](
                facebook::jsi::Runtime& rt,
                const facebook::jsi::Value&,
                const facebook::jsi::Value*,
                std::size_t) -> facebook::jsi::Value {
                const PitchFrame frame = pollPitchFrameNative();
                facebook::jsi::Object result(rt);
                result.setProperty(rt, "frequencyHz", static_cast<double>(frame.frequencyHz));
                result.setProperty(rt, "confidence", static_cast<double>(frame.confidence));
                result.setProperty(rt, "rmsDb", static_cast<double>(frame.rmsDb));
                result.setProperty(rt, "isLocked", frame.isLocked);
                return result;
            });
    }

    if (propName == "getWaveformSnapshot") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            1,
            [this](
                facebook::jsi::Runtime& rt,
                const facebook::jsi::Value&,
                const facebook::jsi::Value* args,
                std::size_t count) -> facebook::jsi::Value {
                const TypedArraySlice slice = extractFloat32Slice(rt, args, count);
                if (slice.data != nullptr && slice.floatCount > 0) {
                    copyWaveformSnapshotNative(slice.data, slice.floatCount);
                }
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "getSpectrumSnapshot") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            1,
            [this](
                facebook::jsi::Runtime& rt,
                const facebook::jsi::Value&,
                const facebook::jsi::Value* args,
                std::size_t count) -> facebook::jsi::Value {
                const TypedArraySlice slice = extractFloat32Slice(rt, args, count);
                if (slice.data != nullptr && slice.floatCount > 0) {
                    copySpectrumSnapshotNative(slice.data, slice.floatCount);
                }
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "setNoiseGateThresholdDb") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            1,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value* args,
                std::size_t count) -> facebook::jsi::Value {
                if (count >= 1 && args[0].isNumber()) {
                    setNoiseGateThresholdDb(static_cast<float>(args[0].asNumber()));
                }
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "setMetronomeBpm") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            1,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value* args,
                std::size_t count) -> facebook::jsi::Value {
                if (count >= 1 && args[0].isNumber()) {
                    setMetronomeBpm(static_cast<float>(args[0].asNumber()));
                }
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "setMetronomeActive") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            1,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value* args,
                std::size_t count) -> facebook::jsi::Value {
                if (count >= 1 && args[0].isBool()) {
                    setMetronomeActive(args[0].getBool());
                }
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "setDemoMode") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            2,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value* args,
                std::size_t count) -> facebook::jsi::Value {
                const bool enabled = count >= 1 && args[0].isBool() ? args[0].getBool() : false;
                const float freq = count >= 2 && args[1].isNumber() ? static_cast<float>(args[1].asNumber()) : 110.0f;
                setDemoMode(enabled, freq);
                return facebook::jsi::Value::undefined();
            });
    }

    if (propName == "isDemoModeActive") {
        return facebook::jsi::Function::createFromHostFunction(
            runtime,
            name,
            0,
            [this](
                facebook::jsi::Runtime&,
                const facebook::jsi::Value&,
                const facebook::jsi::Value*,
                std::size_t) -> facebook::jsi::Value {
                return facebook::jsi::Value(isDemoModeActive());
            });
    }

    return facebook::jsi::Value::undefined();
}

void StrunaHostObject::install(
    facebook::jsi::Runtime& runtime,
    const std::shared_ptr<StrunaHostObject>& hostObject) {
    facebook::jsi::Object engineObject =
        facebook::jsi::Object::createFromHostObject(runtime, hostObject);
    runtime.global().setProperty(runtime, "__StrunaEngine", std::move(engineObject));
}

}
