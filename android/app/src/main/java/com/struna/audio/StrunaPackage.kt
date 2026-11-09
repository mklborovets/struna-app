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

class MetronomePlaybackThread(
    private val sampleRateHz: Int = 48000,
    private val blockFrames: Int = 512,
    private val onRenderBlock: (FloatArray, Int) -> Unit
) {
    private val isRunning = AtomicBoolean(false)
    private var playbackThread: Thread? = null

    fun start() {
        if (!isRunning.compareAndSet(false, true)) {
            return
        }

        playbackThread = Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            val minBufferBytes = AudioTrack.getMinBufferSize(
                sampleRateHz,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_FLOAT
            )
            val bufferBytes = maxOf(minBufferBytes, blockFrames * 4 * 2)
            val audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(sampleRateHz)
                        .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferBytes)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            val renderBuffer = FloatArray(blockFrames)
            try {
                audioTrack.play()
                while (isRunning.get() && !Thread.currentThread().isInterrupted) {
                    onRenderBlock(renderBuffer, blockFrames)
                    audioTrack.write(
                        renderBuffer,
                        0,
                        blockFrames,
                        AudioTrack.WRITE_BLOCKING
                    )
                }
            } catch (_: IllegalStateException) {
                isRunning.set(false)
            } finally {
                try {
                    if (audioTrack.playState == AudioTrack.PLAYSTATE_PLAYING) {
                        audioTrack.stop()
                    }
                } catch (_: IllegalStateException) {
                }
                audioTrack.release()
            }
        }, "StrunaMetronomePlaybackThread").apply {
            isDaemon = true
            start()
        }
    }

    fun stop() {
        if (!isRunning.compareAndSet(true, false)) {
            return
        }
        playbackThread?.interrupt()
        try {
            playbackThread?.join(300)
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
        }
        playbackThread = null
    }
}

class StrunaAudioModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private var captureThread: AudioCaptureThread? = null
    private var metronomeThread: MetronomePlaybackThread? = null
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
        if (metronomeThread == null) {
            metronomeThread = MetronomePlaybackThread(
                sampleRateHz = 48000,
                blockFrames = 512,
                onRenderBlock = { buffer, frameCount ->
                    nativeRenderMetronomeBlock(buffer, frameCount)
                }
            ).also { it.start() }
        }
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
        metronomeThread?.stop()
        metronomeThread = null
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
    private external fun nativeRenderMetronomeBlock(outputBuffer: FloatArray, frameCount: Int)
    private external fun nativeIsMetronomeActive(): Boolean
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
