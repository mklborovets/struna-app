package com.struna.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Process
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.util.concurrent.atomic.AtomicBoolean

class StrunaAudioModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var captureThread: AudioCaptureThread? = null
    private var metronomeThread: Thread? = null
    private val isMetronomePumpRunning = AtomicBoolean(false)

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
        startMetronomeAudioPump()
        return true
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun startNativeCapture(): Boolean {
        if (!focusManager.requestFocus()) {
            return false
        }
        startMetronomeAudioPump()
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

    private fun startMetronomeAudioPump() {
        if (!isMetronomePumpRunning.compareAndSet(false, true)) {
            return
        }
        metronomeThread = Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
            val sampleRate = 48000
            val blockFrames = 512
            val minBufferBytes = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_FLOAT
            )
            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(maxOf(minBufferBytes, blockFrames * 4 * 2))
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            val blockBuffer = FloatArray(blockFrames)
            try {
                track.play()
                while (isMetronomePumpRunning.get() && !Thread.currentThread().isInterrupted) {
                    val rendered = nativeRenderMetronomeBlock(blockBuffer, blockFrames)
                    if (rendered) {
                        track.write(blockBuffer, 0, blockFrames, AudioTrack.WRITE_BLOCKING)
                    } else {
                        Thread.sleep(15)
                    }
                }
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
            } catch (_: IllegalStateException) {
            } finally {
                try {
                    track.stop()
                } catch (_: IllegalStateException) {
                }
                track.release()
            }
        }, "StrunaMetronomeAudioThread").apply {
            isDaemon = true
            start()
        }
    }

    private fun stopMetronomeAudioPump() {
        if (!isMetronomePumpRunning.compareAndSet(true, false)) {
            return
        }
        metronomeThread?.interrupt()
        metronomeThread = null
    }

    override fun invalidate() {
        stopMetronomeAudioPump()
        stopCaptureInternal(abandonAudioFocus = true)
        super.invalidate()
    }

    private external fun nativeInstallJsi(jsiRuntimePtr: Long)
    private external fun nativePushAudioSamples(samples: FloatArray, count: Int)
    private external fun nativeRenderMetronomeBlock(outputBuffer: FloatArray, frameCount: Int): Boolean
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
