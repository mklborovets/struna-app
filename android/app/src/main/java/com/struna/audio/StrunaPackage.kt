package com.struna.audio

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class StrunaAudioModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var captureThread: AudioCaptureThread? = null
    private val focusManager = AudioFocusManager(
        context = reactContext,
        onFocusLost = { stopCaptureInternal(abandonAudioFocus = false) },
        onFocusGained = { startCaptureInternal() }
    )

    override fun getName(): String = "StrunaAudioModule"

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun installJsiBindings(): Boolean {
        val jsContext = reactContext.javaScriptContextHolder?.get() ?: 0L
        if (jsContext == 0L) {
            return false
        }
        nativeInstallJsi(jsContext)
        return true
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun startNativeCapture(): Boolean {
        if (!focusManager.requestFocus()) {
            return false
        }
        return startCaptureInternal()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun stopNativeCapture() {
        stopCaptureInternal(abandonAudioFocus = true)
    }

    private fun startCaptureInternal(): Boolean {
        if (captureThread?.isCapturing() == true) {
            return true
        }
        val thread = AudioCaptureThread(
            requestedSampleRateHz = 48000,
            frameBlockSize = 512,
            onSamplesCaptured = { samples, count ->
                nativePushAudioSamples(samples, count)
            },
            onSampleRateResolved = { sampleRate ->
                nativeSetSampleRate(sampleRate.toFloat())
            }
        )
        captureThread = thread
        return thread.start()
    }

    private fun stopCaptureInternal(abandonAudioFocus: Boolean) {
        captureThread?.stop()
        captureThread = null
        nativeResetEngine()
        if (abandonAudioFocus) {
            focusManager.abandonFocus()
        }
    }

    override fun invalidate() {
        stopCaptureInternal(abandonAudioFocus = true)
        super.invalidate()
    }

    private external fun nativeInstallJsi(jsiRuntimePtr: Long)
    private external fun nativePushAudioSamples(samples: FloatArray, count: Int)
    private external fun nativeSetSampleRate(sampleRateHz: Float)
    private external fun nativeResetEngine()

    companion object {
        init {
            System.loadLibrary("struna")
        }
    }
}

class StrunaPackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(StrunaAudioModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
