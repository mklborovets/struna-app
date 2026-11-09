#include <jni.h>
#include <jsi/jsi.h>
#include <cstddef>
#include <memory>

#include "StrunaHostObject.hpp"

namespace {

std::shared_ptr<struna::StrunaHostObject>& getSharedHostObject() noexcept {
    static std::shared_ptr<struna::StrunaHostObject> instance =
        std::make_shared<struna::StrunaHostObject>();
    return instance;
}

}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeInstallJsi(
    JNIEnv* env,
    jobject thiz,
    jlong jsiRuntimePtr) {
    (void)env;
    (void)thiz;
    if (jsiRuntimePtr == 0) {
        return;
    }
    auto* runtime = reinterpret_cast<facebook::jsi::Runtime*>(jsiRuntimePtr);
    struna::StrunaHostObject::install(*runtime, getSharedHostObject());
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
        getSharedHostObject()->pushAudioSamples(
            rawElements,
            static_cast<std::size_t>(count));
        env->ReleasePrimitiveArrayCritical(samples, rawElements, JNI_ABORT);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeRenderMetronomeBlock(
    JNIEnv* env,
    jobject thiz,
    jfloatArray outputBuffer,
    jint frameCount) {
    (void)thiz;
    if (outputBuffer == nullptr || frameCount <= 0) {
        return;
    }
    jfloat* rawElements = static_cast<jfloat*>(
        env->GetPrimitiveArrayCritical(outputBuffer, nullptr));
    if (rawElements != nullptr) {
        getSharedHostObject()->renderMetronomeAudioBlock(
            rawElements,
            static_cast<std::size_t>(frameCount));
        env->ReleasePrimitiveArrayCritical(outputBuffer, rawElements, 0);
    }
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeIsMetronomeActive(
    JNIEnv* env,
    jobject thiz) {
    (void)env;
    (void)thiz;
    return getSharedHostObject()->isMetronomeActive() ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeSetSampleRate(
    JNIEnv* env,
    jobject thiz,
    jfloat sampleRateHz) {
    (void)env;
    (void)thiz;
    getSharedHostObject()->setSampleRate(sampleRateHz);
}

extern "C" JNIEXPORT void JNICALL
Java_com_struna_audio_StrunaAudioModule_nativeResetEngine(
    JNIEnv* env,
    jobject thiz) {
    (void)env;
    (void)thiz;
    getSharedHostObject()->resetEngine();
}
