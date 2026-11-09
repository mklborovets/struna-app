#import <Foundation/Foundation.h>
#include <jsi/jsi.h>
#include <cstddef>
#include <cstdint>
#include <memory>

#include "StrunaHostObject.hpp"

namespace {

std::shared_ptr<struna::StrunaHostObject>& getIosSharedHostObject() noexcept {
    static std::shared_ptr<struna::StrunaHostObject> instance =
        std::make_shared<struna::StrunaHostObject>();
    return instance;
}

}

extern "C" void StrunaIosInstallJsi(void* jsiRuntimePtr) {
    if (jsiRuntimePtr == nullptr) {
        return;
    }
    auto* runtime = static_cast<facebook::jsi::Runtime*>(jsiRuntimePtr);
    struna::StrunaHostObject::install(*runtime, getIosSharedHostObject());
}

extern "C" void StrunaIosPushAudioSamples(const float* samples, int32_t count) {
    if (samples == nullptr || count <= 0) {
        return;
    }
    getIosSharedHostObject()->pushAudioSamples(
        samples,
        static_cast<std::size_t>(count));
}

extern "C" void StrunaIosSetSampleRate(float sampleRateHz) {
    getIosSharedHostObject()->setSampleRate(sampleRateHz);
}

extern "C" void StrunaIosResetEngine(void) {
    getIosSharedHostObject()->resetEngine();
}
