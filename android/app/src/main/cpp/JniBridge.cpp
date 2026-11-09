#include <jni.h>
#include <array>
#include <atomic>
#include <cstddef>

#include "AudioTypes.hpp"
#include "PitchStabilizer.hpp"
#include "RingBuffer.hpp"
#include "RmsGate.hpp"
#include "YinDetector.hpp"

namespace {

class AndroidAudioEngineBridge {
public:
    static AndroidAudioEngineBridge& instance() noexcept {
        static AndroidAudioEngineBridge bridge;
        return bridge;
    }

    void pushAudioSamples(const float* samples, std::size_t count) noexcept {
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

    struna::PitchFrame pollLatestPitchFrame() noexcept {
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
    AndroidAudioEngineBridge() noexcept
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

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeInstallJsi(
    JNIEnv* env,
    jobject thiz,
    jlong jsiRuntimePtr) {
    (void)env;
    (void)thiz;
    (void)jsiRuntimePtr;
}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativePushAudioSamples(
    JNIEnv* env,
    jobject thiz,
    jfloatArray samples,
    jint count) {
    (void)thiz;
    if (samples == nullptr || count <= 0) {
        return;
    }
    jfloat* rawElements = static_cast<jfloat*>(
        env->GetPrimitiveArrayCritical(samples, nullptr));
    if (rawElements != nullptr) {
        AndroidAudioEngineBridge::instance().pushAudioSamples(
            rawElements,
            static_cast<std::size_t>(count));
        env->ReleasePrimitiveArrayCritical(samples, rawElements, JNI_ABORT);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeSetSampleRate(
    JNIEnv* env,
    jobject thiz,
    jfloat sampleRateHz) {
    (void)env;
    (void)thiz;
    AndroidAudioEngineBridge::instance().setSampleRate(sampleRateHz);
}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeResetEngine(
    JNIEnv* env,
    jobject thiz) {
    (void)env;
    (void)thiz;
    AndroidAudioEngineBridge::instance().reset();
}
