#import <Foundation/Foundation.h>
#include <jsi/jsi.h>
#include <cstddef>
#include <cstdint>
#include <memory>

#include "StrunaHostObject.hpp"

@interface NSObject (StrunaAudioCaptureDynamic)
+ (instancetype)shared;
- (BOOL)startCapture;
- (void)stopCapture;
- (void)setMetronomeActive:(BOOL)active;
@end

namespace {

Class resolveCaptureServiceClass() noexcept {
    return NSClassFromString(@"StrunaAudioCaptureService");
}

bool startIosAudioCapture() noexcept {
    Class cls = resolveCaptureServiceClass();
    if (cls == Nil) {
        return false;
    }
    id service = [cls shared];
    if (service == nil) {
        return false;
    }
    return [service startCapture] == YES;
}

void stopIosAudioCapture() noexcept {
    Class cls = resolveCaptureServiceClass();
    if (cls == Nil) {
        return;
    }
    id service = [cls shared];
    if (service != nil) {
        [service stopCapture];
    }
}

void setIosMetronomeActive(bool active) noexcept {
    Class cls = resolveCaptureServiceClass();
    if (cls == Nil) {
        return;
    }
    id service = [cls shared];
    if (service != nil) {
        [service setMetronomeActive:active ? YES : NO];
    }
}

std::shared_ptr<struna::StrunaHostObject>& getIosSharedHostObject() noexcept {
    static std::shared_ptr<struna::StrunaHostObject> instance =
        std::make_shared<struna::StrunaHostObject>(
            []() { return startIosAudioCapture(); },
            []() { stopIosAudioCapture(); },
            [](bool active) { setIosMetronomeActive(active); });
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

extern "C" bool StrunaIosRenderMetronomeBlock(float* outputBuffer, int32_t frameCount) {
    if (outputBuffer == nullptr || frameCount <= 0) {
        return false;
    }
    if (!getIosSharedHostObject()->isMetronomeActive()) {
        return false;
    }
    getIosSharedHostObject()->renderMetronomeAudioBlock(
        outputBuffer,
        static_cast<std::size_t>(frameCount));
    return true;
}

extern "C" void StrunaIosSetSampleRate(float sampleRateHz) {
    getIosSharedHostObject()->setSampleRate(sampleRateHz);
}

extern "C" void StrunaIosResetEngine(void) {
    getIosSharedHostObject()->resetEngine();
}

#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>

@interface StrunaAudioModule : NSObject <RCTBridgeModule>
@end

@implementation StrunaAudioModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(StrunaAudioModule)

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installJsiBindings) {
    RCTCxxBridge* cxxBridge = (RCTCxxBridge*)self.bridge;
    if (cxxBridge == nil || cxxBridge.runtime == nullptr) {
        return @(NO);
    }
    StrunaIosInstallJsi(cxxBridge.runtime);
    return @(YES);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(startNativeCapture) {
    return @(startIosAudioCapture());
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(stopNativeCapture) {
    stopIosAudioCapture();
    return nil;
}

@end
#endif
