#include "StrunaHostObject.hpp"
#include <algorithm>
#include <array>
#include <cstring>
#include <string>
#include <utility>

namespace struna {

StrunaHostObject::StrunaHostObject(
    StartCaptureCallback onStartCapture,
    StopCaptureCallback onStopCapture) noexcept
    : onStartCapture_(std::move(onStartCapture)),
      onStopCapture_(std::move(onStopCapture)),
      isCapturing_(false),
      sampleRateHz_(48000.0f),
      rmsGate_(-52.0f),
      yinDetector_(48000.0f),
      stabilizer_(80.0f, 0.85f, 0.45f),
      metronomeScheduler_(48000.0f) {}

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
    ringBuffer_.clear();
    stabilizer_.reset();
}

PitchFrame StrunaHostObject::pollPitchFrameNative() noexcept {
    std::array<float, kDefaultAnalysisWindowSize> window{};
    if (!ringBuffer_.copyLatestWindow(window.data(), window.size())) {
        return {0.0f, 0.0f, RmsGate::kSilenceFloorDb, false};
    }

    float rmsDb = RmsGate::kSilenceFloorDb;
    const bool aboveGate = rmsGate_.isAboveThreshold(window.data(), window.size(), rmsDb);
    if (!aboveGate) {
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

void StrunaHostObject::renderMetronomeAudioBlock(
    float* outputBuffer,
    std::size_t frameCount) noexcept {
    metronomeScheduler_.renderBlock(outputBuffer, frameCount);
}

void StrunaHostObject::setNoiseGateThresholdDb(float decibels) noexcept {
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
                bool started = true;
                if (onStartCapture_) {
                    started = onStartCapture_();
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
                if (onStopCapture_) {
                    onStopCapture_();
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
                if (count < 1 || !args[0].isObject()) {
                    return facebook::jsi::Value::undefined();
                }
                facebook::jsi::Object typedArray = args[0].asObject(rt);
                if (!typedArray.hasProperty(rt, "buffer")) {
                    return facebook::jsi::Value::undefined();
                }
                facebook::jsi::Value bufferVal = typedArray.getProperty(rt, "buffer");
                if (!bufferVal.isObject()) {
                    return facebook::jsi::Value::undefined();
                }
                facebook::jsi::Object bufferObj = bufferVal.asObject(rt);
                if (!bufferObj.isArrayBuffer(rt)) {
                    return facebook::jsi::Value::undefined();
                }
                facebook::jsi::ArrayBuffer arrayBuffer = bufferObj.getArrayBuffer(rt);
                const std::size_t floatCount = arrayBuffer.size(rt) / sizeof(float);
                float* floatData = reinterpret_cast<float*>(arrayBuffer.data(rt));
                copyWaveformSnapshotNative(floatData, floatCount);
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
