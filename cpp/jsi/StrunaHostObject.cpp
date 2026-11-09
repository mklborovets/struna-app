#include "StrunaHostObject.hpp"
#include <algorithm>
#include <array>
#include <cstdint>
#include <cstring>
#include <string>
#include <utility>

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
      rmsGate_(-52.0f),
      yinDetector_(48000.0f),
      stabilizer_(80.0f, 0.85f, 0.45f),
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
    ringBuffer_.clear();
    stabilizer_.reset();
    hasPollTimestamp_ = false;
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

    for (std::size_t i = 0; i < length; ++i) {
        const std::size_t sampleIdx = (i * window.size()) / length;
        targetBuffer[i] = std::clamp(window[sampleIdx], -1.0f, 1.0f);
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
        "setMetronomeActive");
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
