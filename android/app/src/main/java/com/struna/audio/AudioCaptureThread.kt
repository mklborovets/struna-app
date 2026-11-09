package com.struna.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Process
import java.util.concurrent.atomic.AtomicBoolean

class AudioCaptureThread(
    private val requestedSampleRateHz: Int = 48000,
    private val frameBlockSize: Int = 512,
    private val onSamplesCaptured: (FloatArray, Int) -> Unit,
    private val onSampleRateResolved: (Int) -> Unit
) {
    private val isRunning = AtomicBoolean(false)
    private var workerThread: Thread? = null

    fun start(): Boolean {
        if (isRunning.get()) {
            return true
        }
        val recorder = createOptimalAudioRecord() ?: return false
        if (recorder.state != AudioRecord.STATE_INITIALIZED) {
            recorder.release()
            return false
        }

        val actualSampleRate = recorder.sampleRate
        onSampleRateResolved(actualSampleRate)
        isRunning.set(true)

        workerThread = Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            val preallocatedBuffer = FloatArray(frameBlockSize)
            try {
                recorder.startRecording()
                while (isRunning.get() && !Thread.currentThread().isInterrupted) {
                    val samplesRead = recorder.read(
                        preallocatedBuffer,
                        0,
                        frameBlockSize,
                        AudioRecord.READ_BLOCKING
                    )
                    if (samplesRead > 0) {
                        onSamplesCaptured(preallocatedBuffer, samplesRead)
                    }
                }
            } catch (_: IllegalStateException) {
                isRunning.set(false)
            } finally {
                try {
                    if (recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                        recorder.stop()
                    }
                } catch (_: IllegalStateException) {
                }
                recorder.release()
            }
        }, "StrunaAudioCaptureThread").apply {
            isDaemon = true
            start()
        }

        return true
    }

    fun stop() {
        if (!isRunning.compareAndSet(true, false)) {
            return
        }
        workerThread?.interrupt()
        try {
            workerThread?.join(300)
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
        }
        workerThread = null
    }

    fun isCapturing(): Boolean = isRunning.get()

    @SuppressLint("MissingPermission")
    private fun createOptimalAudioRecord(): AudioRecord? {
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val encoding = AudioFormat.ENCODING_PCM_FLOAT
        val minBufferBytes = AudioRecord.getMinBufferSize(
            requestedSampleRateHz,
            channelConfig,
            encoding
        )
        if (minBufferBytes <= 0) {
            return null
        }

        val frameBufferBytes = frameBlockSize * 4 * 2
        val bufferSizeInBytes = maxOf(minBufferBytes, frameBufferBytes)

        val audioSources = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            intArrayOf(
                MediaRecorder.AudioSource.UNPROCESSED,
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.MIC
            )
        } else {
            intArrayOf(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                MediaRecorder.AudioSource.MIC
            )
        }

        for (source in audioSources) {
            try {
                val candidate = AudioRecord(
                    source,
                    requestedSampleRateHz,
                    channelConfig,
                    encoding,
                    bufferSizeInBytes
                )
                if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                    return candidate
                }
                candidate.release()
            } catch (_: IllegalArgumentException) {
            } catch (_: SecurityException) {
                return null
            }
        }
        return null
    }
}
